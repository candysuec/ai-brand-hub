import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContent(prompt);
  return Response.json({ output: result.response.text() });
}