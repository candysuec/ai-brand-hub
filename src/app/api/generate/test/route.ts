import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("Write a short test message for Gemini API connection.");
    const response = await result.response;
    const text = response.text();
    return NextResponse.json({ success: true, message: "Gemini API test successful", response: text });
  } catch (error: any) {
    console.error("❌ Gemini test route error:", error);
    return NextResponse.json(
      { success: false, error: error.message, suggestion: "Ensure GEMINI_API_KEY is valid and the model name exists (try 'gemini-2.5-flash')." },
      { status: 500 }
    );
  }
}
