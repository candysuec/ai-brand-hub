import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

/**
 * Health route with self-healing logic.
 *  - Detects old genAI.listModels() usage
 *  - Repairs by switching to generateContent()
 *  - Returns detailed JSON for diagnosis
 */
export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { status: "error", message: "Missing GEMINI_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const { prompt = "healthcheck" } = await request.json();
    const genAI = new GoogleGenAI({ apiKey });

    // --- Self-healing phase 1: detect legacy method ---
    // Some outdated helpers might have patched genAI with listModels.
    if (typeof (genAI as any).listModels === "function") {
      console.warn("[healthcheck] Detected old listModels method; disabling...");
      delete (genAI as any).listModels; // remove old reference
    }

    // --- Self-healing phase 2: verify runtime integrity ---
    if ((genAI as any).listModels) {
      throw new Error(
        "Legacy listModels reference still present after cleanup."
      );
    }

    // --- Phase 3: attempt content generation test ---
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({
      status: "ok",
      model: "gemini-1.5-pro",
      prompt,
      output: text,
      note: "Gemini API reachable and healthy",
    });
  } catch (error: any) {
    // --- Self-healing phase 4: adaptive retry ---
    if (
      error?.message?.includes("listModels") ||
      error?.message?.includes("not a function")
    ) {
      console.warn(
        "[healthcheck] Caught listModels error, re-initializing client..."
      );
      try {
        const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent("retry healthcheck");
        const text = result.response.text();

        return NextResponse.json({
          status: "ok",
          recovered: true,
          message:
            "Recovered from legacy listModels reference automatically.",
          output: text,
        });
      } catch (retryError: any) {
        return NextResponse.json(
          {
            status: "error",
            message: retryError.message,
            phase: "retry-failed",
          },
          { status: 500 }
        );
      }
    }

    // --- Standard failure ---
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      "POST /api/generate/health with { \"prompt\": \"your test\" } to run a live Gemini health check.",
  });
}
