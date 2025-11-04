import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

const prisma = new PrismaClient();

/**
 * Calls the Gemini API to generate brand slogans.
 */
const callGeminiAPI = async (prompt: string) => {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API error:", data.error);
      throw new Error(data.error.message);
    }

    const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return output ? [output] : ["No slogan generated."];
  } catch (err) {
    console.error("Gemini fetch failed:", err);
    return ["Error generating slogan"];
  }
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
