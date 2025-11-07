import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Calls the Gemini API to generate brand slogans.
 */
const callGeminiAPI = async (prompt: string) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = await response.text();
  console.log("Raw Gemini slogan response text:", text);
  return text.split('\n').filter(slogan => slogan.trim() !== '');
};

/**
 * POST handler to generate slogans for a given brand.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { input, brandId } = await req.json();

    if (!input || !brandId) {
      return NextResponse.json(
        { error: 'Input and brandId are required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Verify that the brand belongs to the logged-in user
    const existingBrand = await prisma.brand.findUnique({
      where: { id: brandId, userId: session.user.id },
    });

    if (!existingBrand) {
      return new NextResponse('Brand not found or unauthorized', { status: 404 });
    }

    // Create a short prompt for Gemini
    const truncatedInput = input.slice(0, 200);
    const prompt = `Create 3 short, catchy brand slogans for: ${truncatedInput}`;

    const slogans = await callGeminiAPI(prompt);

    // Save slogans in the database
    await prisma.brand.update({
      where: { id: brandId },
      data: { slogans },
    });

    return NextResponse.json({ slogans });
  } catch (error) {
    console.error("Slogan generation failed:", error);
    return NextResponse.json(
      { error: 'Failed to generate slogan' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
