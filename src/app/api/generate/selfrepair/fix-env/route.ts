import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Gemini Env Auto-Fix
 * ----------------------------------------
 * Ensures your environment files are correctly set up for Gemini API access.
 *
 * ✅ Checks:
 *   - .env, .env.local existence
 *   - GOOGLE_API_KEY presence
 *   - NEXT_PUBLIC_GOOGLE_API_KEY consistency
 *
 * 🛠️ Fixes:
 *   - Creates missing .env.local if needed
 *   - Adds placeholder GOOGLE_API_KEY=
 *   - Syncs NEXT_PUBLIC_GOOGLE_API_KEY
 *
 * Supports ?dryrun=true for preview-only mode.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dryrun = url.searchParams.get("dryrun") === "true";

  const projectRoot = process.cwd();
  const envLocalPath = path.join(projectRoot, ".env.local");
  const envPath = path.join(projectRoot, ".env");
  const messages: string[] = [];
  const fixes: string[] = [];

  // Helper to safely read .env files
  function readEnvFile(filePath: string): Record<string, string> {
    if (!fs.existsSync(filePath)) return {};
    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    const env: Record<string, string> = {};
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (match) env[match[1]] = match[2].replace(/^"|"$/g, "");
    }
    return env;
  }

  // Helper to write env files safely
  function writeEnvFile(filePath: string, data: Record<string, string>) {
    const lines = Object.entries(data).map(([k, v]) => `${k}=${v}`);
    fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8");
  }

  try {
    // Step 1: Load existing values
    const envLocal = readEnvFile(envLocalPath);
    const env = readEnvFile(envPath);

    const currentKey =
      envLocal.GOOGLE_API_KEY ||
      env.GOOGLE_API_KEY ||
      envLocal.GEMINI_API_KEY || // Added for consistency
      env.GEMINI_API_KEY || // Added for consistency
      process.env.GOOGLE_API_KEY || 
      process.env.GEMINI_API_KEY; // Added for consistency

    const currentPublicKey =
      envLocal.NEXT_PUBLIC_GOOGLE_API_KEY ||
      env.NEXT_PUBLIC_GOOGLE_API_KEY ||
      envLocal.NEXT_PUBLIC_GEMINI_API_KEY || // Added for consistency
      env.NEXT_PUBLIC_GEMINI_API_KEY || // Added for consistency
      process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY; // Added for consistency

    // Step 2: Determine missing keys
    if (!currentKey) {
      fixes.push("Added GOOGLE_API_KEY placeholder to .env.local");
      envLocal.GOOGLE_API_KEY = "YOUR_API_KEY_HERE";
      envLocal.GEMINI_API_KEY = "YOUR_API_KEY_HERE"; // Added for consistency
    }

    // Sync NEXT_PUBLIC_GOOGLE_API_KEY
    if (!currentPublicKey && currentKey) {
      fixes.push("Added NEXT_PUBLIC_GOOGLE_API_KEY synced to GOOGLE_API_KEY");
      envLocal.NEXT_PUBLIC_GOOGLE_API_KEY = currentKey;
      envLocal.NEXT_PUBLIC_GEMINI_API_KEY = currentKey; // Added for consistency
    } else if (
      currentPublicKey &&
      currentKey &&
      currentPublicKey !== currentKey
    ) {
      fixes.push(
        "Updated NEXT_PUBLIC_GOOGLE_API_KEY to match GOOGLE_API_KEY (for Next.js client env consistency)"
      );
      envLocal.NEXT_PUBLIC_GOOGLE_API_KEY = currentKey;
      envLocal.NEXT_PUBLIC_GEMINI_API_KEY = currentKey; // Added for consistency
    }

    // Step 3: Create .env.local if missing
    if (!fs.existsSync(envLocalPath)) {
      messages.push("Created new .env.local file");
      if (!dryrun) fs.writeFileSync(envLocalPath, "", "utf8");
    }

    // Step 4: Apply fixes
    if (fixes.length > 0 && !dryrun) {
      writeEnvFile(envLocalPath, envLocal);
    }

    // Step 5: Results
    return NextResponse.json({
      status: "ok",
      dryrun,
      envLocalPath,
      messages,
      fixes,
      summary:
        fixes.length === 0
          ? "✅ Environment variables already healthy."
          : `${dryrun ? "Previewed" : "Applied"} ${fixes.length} change(s)`,
      nextSteps:
        fixes.length === 0
          ? []
          : [
              "1️⃣ Edit .env.local and add your actual GOOGLE_API_KEY",
              "2️⃣ Restart your dev server: npm run dev",
              "3️⃣ Test: curl http://localhost:3000/api/generate/selfrepair/status",
            ],
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      "POST /api/generate/selfrepair/fix-env?dryrun=true ensures .env.local and GOOGLE_API_KEY are valid. Omit ?dryrun to apply fixes.",
  });
}
