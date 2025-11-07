import { sendAlert } from "@/lib/alerts/mailer";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

// Helper to safely read env
const readEnv = (envLocalPath: string) => {
  if (!fs.existsSync(envLocalPath)) return {};
  const content = fs.readFileSync(envLocalPath, "utf8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
  return env;
};

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

export async function runSelfRepair(dryrun = false, repair = false) {
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
      if (entry.isDirectory()) scanDir(full);
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
      throw new Error(`src directory not found at ${srcDir}`);
    }

    scanDir(srcDir);
    updatePackageJson();

    const message =
      fixes.length === 0 && !pkgEdited
        ? "No deprecated Gemini SDK code found."
        : `${dryrun ? "Previewed" : "Patched"} ${fixes.length} code change(s)${pkgEdited ? " + package.json updated" : ""}.`;

    return { status: "ok", dryrun, message, fixes, notes, pkgEdited };
  } catch (error: any) {
    return { status: "error", message: error.message, stack: error.stack };
  }
}
