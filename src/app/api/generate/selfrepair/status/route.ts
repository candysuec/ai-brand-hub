import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Gemini Environment & SDK Health Status
 * --------------------------------------
 * Checks:
 *  1. API key presence
 *  2. Installed SDK version (@google/generative-ai)
 *  3. Connectivity and basic generation test
 *
 * Safe to run in production (returns sanitized info).
 */

export const runtime = "nodejs";

export async function GET() {
  const results: Record<string, any> = {};
  const projectRoot = process.cwd();
  const pkgPath = path.join(projectRoot, "package.json");

  // --- 1. Check for API key ---
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  results.apiKeyDetected = !!apiKey;
  results.apiKeySource = apiKey
    ? apiKey.startsWith("AIza") ? "Valid Google-style key" : "Nonstandard format (check .env)"
    : "Missing (set GOOGLE_API_KEY=...)";

  // --- 2. Get installed SDK version ---
  try {
    const pkgRaw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(pkgRaw);
    const deps = pkg.dependencies ?? {};
    const devDeps = pkg.devDependencies ?? {};

    const version =
      deps["@google/generative-ai"] ||
      devDeps["@google/generative-ai"] ||
      "❌ Not installed";

    results.sdkVersion = version;
  } catch (err: any) {
    results.sdkVersion = `❌ Could not read package.json: ${err.message}`;
  }

  // --- 3. Try initializing Gemini ---
  try {
    // Dynamically import only if SDK is installed
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    if (!apiKey) {
      throw new Error("No API key available.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Perform a lightweight prompt test
    const testPrompt = "Return the word 'ok'.";
    const result = await model.generateContent(testPrompt);
    const text = result.response.text();

    results.modelTest = text.includes("ok")
      ? "✅ Gemini API responded successfully"
      : `⚠️ Unexpected response: ${text.slice(0, 100)}...`;
  } catch (err: any) {
    results.modelTest = `❌ Gemini call failed: ${err.message}`;
  }

  // --- 4. Summarize health ---
  results.health =
    results.apiKeyDetected && results.modelTest?.startsWith("✅")
      ? "✅ Environment healthy"
      : "⚠️ Issues detected";

  return NextResponse.json(results);
}
