import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function GET() {
  try {
    // Initialize Gemini client
    const genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });

    // ✅ Optional: test a simple generation
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent("Write a short test message for Gemini API connection.");
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      installedVersion: "1.29.0",
      testOutput: text,
    });
  } catch (error: any) {
    console.error("❌ Gemini test route error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error",
        suggestion:
          "Ensure GEMINI_API_KEY is valid and the model name exists (try 'gemini-1.5-pro').",
      },
      { status: 500 }
    );
  }
}