// Node runtime required for fs and dynamic imports
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sendAlert } from "@/lib/alerts/mailer";
import fs from "fs";
import path from "path";

/**
 * Gemini Self-Repair Dashboard
 * -----------------------------
 * Aggregates results from:
 *   🧩 Codebase scan & auto-fix (legacy SDK cleanup)
 *   🔑 Environment validation (.env, API key)
 *   ⚙️ SDK status & live Gemini health test
 * 
 * Use ?dryrun=true for preview-only mode.
 * Use ?repair=true to apply code + env fixes automatically.
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dryrun = url.searchParams.get("dryrun") === "true";
  const repair = url.searchParams.get("repair") === "true";

  const projectRoot = process.cwd();
  const srcDir = path.join(projectRoot, "src");
  const pkgPath = path.join(projectRoot, "package.json");
  const envLocalPath = path.join(projectRoot, ".env.local");

  const summary: Record<string, any> = {
    timestamp: new Date().toISOString(),
    mode: dryrun ? "Dry Run" : repair ? "Repair Mode" : "Read Only",
    checks: {},
  };

  // Helper to safely read env
  const readEnv = () => {
    if (!fs.existsSync(envLocalPath)) return {};
    const content = fs.readFileSync(envLocalPath, "utf8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (match) env[match[1]] = match[2].replace(/^"|"$/g, "");
    }
    return env;
  };

  // === 1️⃣ CODEBASE SCAN ===
  try {
    const methodPatterns = [
      ".listModels",
      ".generateText(",
      ".generateMessage(",
      ".generateTextStream(",
      ".startChat(",
      " @google-ai/generativelanguage",
    ];

    const matches: { file: string; line: number; snippet: string }[] = [];
    function scan(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scan(full);
        else if (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) {
          const lines = fs.readFileSync(full, "utf8").split("\n");
          lines.forEach((l, i) => {
            if (methodPatterns.some((p) => l.includes(p))) {
              matches.push({ file: full, line: i + 1, snippet: l.trim() });
            }
          });
        }
      }
    }

    if (fs.existsSync(srcDir)) scan(srcDir);
    summary.checks.codebase = {
      deprecatedReferences: matches.length,
      matches,
      message:
        matches.length === 0
          ? "✅ No legacy Gemini SDK references found."
          : `⚠️ Found ${matches.length} deprecated references.`,
    };
  } catch (err: any) {
    summary.checks.codebase = { error: err.message };
  }

  // === 2️⃣ ENVIRONMENT CHECK ===
  try {
    const env = readEnv();
    const key =
      env.GOOGLE_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      env.GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY;
    const pubKey =
      env.NEXT_PUBLIC_GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
      env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    const fixes: string[] = [];
    if (!fs.existsSync(envLocalPath)) {
      fixes.push(".env.local missing");
      if (repair && !dryrun) fs.writeFileSync(envLocalPath, "");
    }

    if (!key) {
      fixes.push("Missing GOOGLE_API_KEY");
      if (repair && !dryrun)
        fs.appendFileSync(
          envLocalPath,
          "GOOGLE_API_KEY=YOUR_API_KEY_HERE\n",
          "utf8"
        );
    }

    if (!pubKey && key) {
      fixes.push("NEXT_PUBLIC_GOOGLE_API_KEY missing, syncing it");
      if (repair && !dryrun)
        fs.appendFileSync(
          envLocalPath,
          `NEXT_PUBLIC_GOOGLE_API_KEY=${key}\n`,
          "utf8"
        );
    }

    summary.checks.environment = {
      file: envLocalPath,
      googleApiKey: key ? "✅ Present" : "❌ Missing",
      nextPublicKey: pubKey ? "✅ Present" : "❌ Missing",
      fixes,
      message:
        fixes.length === 0
          ? "✅ Environment healthy."
          : `${dryrun ? "Previewed" : "Detected"} ${fixes.length} issue(s).`,
    };
  } catch (err: any) {
    summary.checks.environment = { error: err.message };
  }

  // === 3️⃣ SDK HEALTH TEST ===
  try {
    const apiKey =
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      readEnv().GOOGLE_API_KEY ||
      readEnv().GEMINI_API_KEY;

    if (!apiKey) throw new Error("No API key found in env.");

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const test = await model.generateContent("Return the word 'ok'.");
    const text = test.response.text();

    summary.checks.sdk = {
      version: (() => {
        try {
          const pkg = JSON.parse(
            fs.readFileSync(pkgPath, "utf8")
          ).dependencies["@google/generative-ai"];
          return pkg || "unknown";
        } catch {
          return "unknown";
        }
      })(),
      response: text.slice(0, 100),
      healthy: text.toLowerCase().includes("ok"),
      message:
        text.toLowerCase().includes("ok")
          ? "✅ Gemini API responding normally."
          : `⚠️ Unexpected response: ${text.slice(0, 100)}...`,
    };
  } catch (err: any) {
    summary.checks.sdk = {
      healthy: false,
      message: `❌ SDK call failed: ${err.message}`,
    };
  }

  // === SUMMARY ===
  summary.overall =
    Object.values(summary.checks).some(
      (check: any) => check?.healthy === false || check?.fixes?.length > 0
    )
      ? "⚠️ Some issues detected."
      : "✅ Everything looks good!";

    // === Write summary to logs ===
    try {
      const logEntry = {
        overall: summary.overall,
        sdk: summary.checks.sdk?.message,
        env: summary.checks.environment?.message,
        code: summary.checks.codebase?.message,
        mode: summary.mode,
      };

      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/generate/selfrepair/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logEntry),
      });
    } catch (err) {
      console.warn("⚠️ Failed to write selfrepair log:", err);
    }

  return NextResponse.json(summary);
}

// Detect recurring NextAuth JWT decryption issues
function detectJWTSessionError(logText: string) {
  const matches = logText.match(/JWEDecryptionFailed|JWT_SESSION_ERROR/g);
  const count = matches ? matches.length : 0;

  if (count === 0) {
    return {
      status: "✅",
      message: "No NextAuth JWT decryption issues detected.",
      level: "info",
    };
  }

  if (count < 3) {
    return {
      status: "⚠️",
      message: `Detected ${count} JWT_SESSION_ERROR occurrences — possible cookie or secret mismatch.`,
      level: "warn",
    };
  }

  return {
    status: "❌",
    message:
      "Multiple JWT_SESSION_ERROR events detected. Likely invalid NEXTAUTH_SECRET or stale cookies. Clear browser cookies and verify env configuration.",
    level: "error",
  };
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dryrun = url.searchParams.get("dryrun") === "true";
  const repair = url.searchParams.get("repair") === "true";

  const projectRoot = process.cwd();
  const srcDir = path.join(projectRoot, "src");
  const pkgPath = path.join(projectRoot, "package.json");
  const envLocalPath = path.join(projectRoot, ".env.local");

  const fixes: { file: string; line: number; before: string; after: string }[] = [];
  const notes: string[] = [];
  let pkgEdited = false;

  // ---- 1) Source code rewrites ----
  // Deprecated -> replacement (simple line rewrites)
  const methodReplacements: Record<string, string> = {
    ".listModels": "// [auto-fix] Deprecated .listModels() removed.\n// const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });",
    ".generateText(": ".generateContent(",
    ".generateTextStream(": ".generateContentStream(",
    ".generateMessage(": ".generateContent(",
    ".startChat(": ".startChatSession(",
  };

  // Import rewrites
  const importOldPkg = " @google-ai/generativelanguage";
  const importNewPkg = " @google/generative-ai";
  const legacyIdentifiers = [
    "TextServiceClient",
    "DiscussServiceClient",
    "ModelServiceClient",
    "PredictionServiceClient",
    "GoogleAIFileManager",
  ];

  function rewriteImportsAndMethods(filePath: string) {
    const extOk = [".ts", ".tsx", ".js", ".jsx"].some((e) => filePath.endsWith(e));
    if (!extOk) return;

    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      const orig = lines[i];

      // A) Import package path modernization
      if (orig.includes(importOldPkg)) {
        modified = true;
        const before = orig.trim();

        // Replace package path
        let after = orig.replace(importOldPkg, importNewPkg);

        // If legacy client names are present, replace them with GoogleGenerativeAI in the import line
        if (legacyIdentifiers.some((id) => orig.includes(id))) {
          // naive replacement: replace entire import spec with GoogleGenerativeAI
          after = after.replace(
            /import\s+{[^}]+}\s+from\s+['"][^'"]+['"]/, // Corrected regex escaping
            "import { GoogleGenerativeAI } from ' @google/generative-ai';"
          );
          notes.push(`[${path.relative(projectRoot, filePath)}] Replaced legacy clients with GoogleGenerativeAI`);
        }

        if (before !== after.trim()) {
          lines[i] = after;
          fixes.push({ file: filePath, line: i + 1, before, after: after.trim() });
        }
      }

      // B) Method rewrites (line-by-line replace)
      for (const [deprecated, replacement] of Object.entries(methodReplacements)) {
        if (lines[i].includes(deprecated)) {
          modified = true;
          const before = lines[i].trim();
          const after = replacement;
          lines[i] = after;
          fixes.push({ file: filePath, line: i + 1, before, after });
        }
      }
    }

    if (modified && !dryrun) {
      fs.writeFileSync(filePath, lines.join("\n"), "utf8");
    }
  }

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else rewriteImportsAndMethods(full);
    }
  }

  // ---- 2) package.json update ----
  function updatePackageJson() {
    if (!fs.existsSync(pkgPath)) {
      notes.push("package.json not found; skipping dependency update.");
      return;
    }

    try {
      const raw = fs.readFileSync(pkgPath, "utf8");
      const pkg = JSON.parse(raw);

      const deps = pkg.dependencies ?? {};
      const devDeps = pkg.devDependencies ?? {};

      const hasOld = deps[importOldPkg] || devDeps[importOldPkg];
      const hasNew = deps[importNewPkg] || devDeps[importNewPkg];
      const targetVersion = "^0.24.1";

      if (hasOld) {
        delete deps[importOldPkg];
        delete devDeps[importOldPkg];
        pkgEdited = true;
        notes.push(`Removed '${importOldPkg}' from dependencies`);
      }

      if (!hasNew) {
        deps[importNewPkg] = targetVersion;
        pkgEdited = true;
        notes.push(`Added '${importNewPkg} @${targetVersion}'`);
      }

      pkg.dependencies = deps;
      pkg.devDependencies = devDeps;

      if (pkgEdited && !dryrun) {
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
      }
    } catch (err: any) {
      notes.push(`Failed to update package.json: ${err.message}`);
    }
  }

  try {
    if (!fs.existsSync(srcDir)) {
      return NextResponse.json(
        { status: "error", message: `src directory not found at ${srcDir}` },
        { status: 400 }
      );
    }

    scanDir(srcDir);
    updatePackageJson();

    const message =
      fixes.length === 0 && !pkgEdited
        ? "No deprecated Gemini SDK code found."
        : `${dryrun ? "Previewed" : "Patched"} ${fixes.length} code change(s)${pkgEdited ? " + package.json updated" : ""}.`;

    return NextResponse.json({
      status: "ok",
      dryrun,
      message,
      fixes,
      notes,
      nextSteps:
        pkgEdited
          ? [
              "Run: npm install",
              "Rebuild: npm run build (or vercel --prod)",
              "Test: curl -X POST /api/generate/health",
            ]
          : [
              "If fixes applied, rebuild: npm run build",
              "Test: curl -X POST /api/generate/health",
            ],
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dryrun = url.searchParams.get("dryrun") === "true";
  const repair = url.searchParams.get("repair") === "true";

  const projectRoot = process.cwd();
  const srcDir = path.join(projectRoot, "src");
  const pkgPath = path.join(projectRoot, "package.json");
  const envLocalPath = path.join(projectRoot, ".env.local");

  const summary: Record<string, any> = {
    timestamp: new Date().toISOString(),
    mode: dryrun ? "Dry Run" : repair ? "Repair Mode" : "Read Only",
    checks: {},
  };

  // Helper to safely read env
  const readEnv = () => {
    if (!fs.existsSync(envLocalPath)) return {};
    const content = fs.readFileSync(envLocalPath, "utf8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (match) env[match[1]] = match[2].replace(/^"|"$/g, "");
    }
    return env;
  };

  // === 1️⃣ CODEBASE SCAN ===
  try {
    const methodPatterns = [
      ".listModels",
      ".generateText(",
      ".generateMessage(",
      ".generateTextStream(",
      ".startChat(",
      " @google-ai/generativelanguage",
    ];

    const matches: { file: string; line: number; snippet: string }[] = [];
    function scan(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scan(full);
        else if (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) {
          const lines = fs.readFileSync(full, "utf8").split("\n");
          lines.forEach((l, i) => {
            if (methodPatterns.some((p) => l.includes(p))) {
              matches.push({ file: full, line: i + 1, snippet: l.trim() });
            }
          });
        }
      }
    }

    if (fs.existsSync(srcDir)) scan(srcDir);
    summary.checks.codebase = {
      deprecatedReferences: matches.length,
      matches,
      message:
        matches.length === 0
          ? "✅ No legacy Gemini SDK references found."
          : `⚠️ Found ${matches.length} deprecated references.`,
    };
  } catch (err: any) {
    summary.checks.codebase = { error: err.message };
  }

  // === 2️⃣ ENVIRONMENT CHECK ===
  try {
    const env = readEnv();
    const key =
      env.GOOGLE_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      env.GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY;
    const pubKey =
      env.NEXT_PUBLIC_GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
      env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    const fixes: string[] = [];
    if (!fs.existsSync(envLocalPath)) {
      fixes.push(".env.local missing");
      if (repair && !dryrun) fs.writeFileSync(envLocalPath, "");
    }

    if (!key) {
      fixes.push("Missing GOOGLE_API_KEY");
      if (repair && !dryrun)
        fs.appendFileSync(
          envLocalPath,
          "GOOGLE_API_KEY=YOUR_API_KEY_HERE\n",
          "utf8"
        );
    }

    if (!pubKey && key) {
      fixes.push("NEXT_PUBLIC_GOOGLE_API_KEY missing, syncing it");
      if (repair && !dryrun)
        fs.appendFileSync(
          envLocalPath,
          `NEXT_PUBLIC_GOOGLE_API_KEY=${key}\n`,
          "utf8"
        );
    }

    summary.checks.environment = {
      file: envLocalPath,
      googleApiKey: key ? "✅ Present" : "❌ Missing",
      nextPublicKey: pubKey ? "✅ Present" : "❌ Missing",
      fixes,
      message:
        fixes.length === 0
          ? "✅ Environment healthy."
          : `${dryrun ? "Previewed" : "Detected"} ${fixes.length} issue(s).`,
    };
  } catch (err: any) {
    summary.checks.environment = { error: err.message };
  }

  // === 3️⃣ SDK HEALTH TEST ===
  try {
    const apiKey =
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      readEnv().GOOGLE_API_KEY ||
      readEnv().GEMINI_API_KEY;

    if (!apiKey) throw new Error("No API key found in env.");

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const test = await model.generateContent("Return the word 'ok'.");
    const text = test.response.text();

    summary.checks.sdk = {
      version: (() => {
        try {
          const pkg = JSON.parse(
            fs.readFileSync(pkgPath, "utf8")
          ).dependencies["@google/generative-ai"];
          return pkg || "unknown";
        } catch {
          return "unknown";
        }
      })(),
      response: text.slice(0, 100),
      healthy: text.toLowerCase().includes("ok"),
      message:
        text.toLowerCase().includes("ok")
          ? "✅ Gemini API responding normally."
          : `⚠️ Unexpected response: ${text.slice(0, 100)}...`,
    };
  } catch (err: any) {
    summary.checks.sdk = {
      healthy: false,
      message: `❌ SDK call failed: ${err.message}`,
    };
  }

  // === SUMMARY ===
  summary.overall =
    Object.values(summary.checks).some(
      (check: any) => check?.healthy === false || check?.fixes?.length > 0
    )
      ? "⚠️ Some issues detected." 
      : "✅ Everything looks good!";

  try {
    const sdkMsg = summary.checks?.sdk?.message || "";
    const envMsg = summary.checks?.environment?.message || "";
    const codeMsg = summary.checks?.codebase?.message || "";
    const overall = summary.overall || "";

    // Decide severity
    const isError =
      sdkMsg.includes("❌") ||
      envMsg.includes("❌") ||
      overall.includes("❌");

    const isWarn =
      sdkMsg.includes("⚠️") ||
      envMsg.includes("⚠️") ||
      codeMsg.includes("⚠️") ||
      overall.includes("⚠️");

    let level: "info" | "warn" | "error" = "info";
    if (isError) level = "error";
    else if (isWarn) level = "warn";

    // Only send if meets ALERTS_MIN_LEVEL (handled inside sendAlert)
    await sendAlert(level, overall || "Self-Repair Report", {
      overall,
      mode: summary.mode,
      sdk: summary.checks?.sdk,
      environment: summary.checks?.environment,
      codebase: summary.checks?.codebase,
      timestamp: summary.timestamp,
    });
  } catch (e) {
    console.warn("⚠️ Failed to send alert email:", (e as Error).message);
  }

  return NextResponse.json(summary);
}