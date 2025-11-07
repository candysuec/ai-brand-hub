import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "test" }] }],
    });
    return NextResponse.json({ gemini: "✅ OK" });
  } catch (error: any) {
    console.error("Error checking Gemini API:", error);
    return NextResponse.json(
      { gemini: `❌ Failed: ${error.message}` },
      { status: 500 }
    );
  }
}