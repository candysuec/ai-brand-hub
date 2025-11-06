import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'; // Import PrismaClient
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

import { GoogleGenerativeAI } from '@google/generative-ai';

const callGeminiAPI = async (prompt: string) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" }, { apiVersion: 'v1beta' });

  console.log("Sending prompt to Gemini:", prompt);
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log("Raw Gemini identity response text:", text);
  console.log("Raw Gemini response text:", text);

  if (!text) {
    throw new Error("No text content found in Gemini response.");
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini response as JSON:", text, e);
    throw new Error("Gemini returned malformed JSON.");
  }
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'An unexpected error occurred while listing models.' }, { status: 500 });
  }
}
