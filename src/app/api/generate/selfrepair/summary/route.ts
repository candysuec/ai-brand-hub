import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

/**
 * AI Diagnostic Summary Route
 * ----------------------------
 * Summarizes the last 7 days of self-repair logs
 * and returns an intelligent health report using Gemini.
 *
 * Optional query: ?sendEmail=true
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sendEmail = url.searchParams.get("sendEmail") === "true";

  try {
    const logPath = path.join(process.cwd(), "logs", "selfrepair-log.json");
    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ error: "No log file found." }, { status: 404 });
    }

    const logs = JSON.parse(fs.readFileSync(logPath, "utf8"));
    const lastWeek = logs
      .filter((e: any) => Date.now() - Date.parse(e.time || "") <= 7 * 24 * 60 * 60 * 1000)
      .map((e: any) => ({
        time: e.time,
        overall: e.overall,
        sdk: e.sdk,
        env: e.env,
        code: e.code,
      }));

    // summarize raw stats
    const total = lastWeek.length;
    const errors = lastWeek.filter((e: any) => e.overall?.includes("❌")).length;
    const warns = lastWeek.filter((e: any) => e.overall?.includes("⚠️")).length;
    const oks = lastWeek.filter((e: any) => e.overall?.includes("✅")).length;
    const successRate = total ? Math.round((oks / total) * 100) : 0;

    const prompt = `
      You are an AI DevOps analyst. Analyze the following self-repair system logs.
      Identify patterns, trends, and any emerging issues.
      Provide a concise 3-paragraph summary covering:
      - Overall system health and stability
      - Key error types or anomalies
      - Recommendations for improvement
      Include one-sentence executive summary at the top.

      Summary data:
      - Total runs: ${total}
      - OK: ${oks}
      - Warnings: ${warns}
      - Errors: ${errors}
      - Success rate: ${successRate}%

      Logs (most recent first):
      ${lastWeek.slice(-25).map((e: any) => `[${e.time}] ${e.overall}`).join("\n")}
    `;

    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!geminiApiKey) {
      throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY in environment");
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    if (sendEmail) {
      const { sendAlert } = await import("@/lib/alerts/mailer");
      await sendAlert("info", "Weekly AI Health Summary", {
        html: `<h2>🤖 AI System Health Summary</h2><p>${summary.replace(/\n/g, "<br/>")}</p>`,
      });
    }

    return NextResponse.json({
      ok: true,
      total,
      errors,
      warns,
      oks,
      successRate,
      summary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}