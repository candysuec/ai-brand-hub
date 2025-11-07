import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }); // Instantiate with apiKey object
    const models = [];
    for await (const model of genAI.models.list()) {
      models.push(model);
    }
    return NextResponse.json({ models });
  } catch (error: any) {
    console.error("Error listing Gemini models:", error);
    return NextResponse.json(
      { error: "Failed to list Gemini models", details: error.message },
      { status: 500 }
    );
  }
}
