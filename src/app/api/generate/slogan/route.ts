import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

// This is a placeholder for the actual Gemini API client.
const callGeminiAPI = async (prompt: string) => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const mockApiResponse = [
    `The future of branding is here, for ${prompt}.`,
    `Unlock your brand's potential with ${prompt}.`,
    `AI-powered branding, simplified for ${prompt}.`,
    `Your brand, reimagined with ${prompt}.`,
  ];
  return mockApiResponse;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { input, brandId } = await req.json();

    if (!input || !brandId) {
      return NextResponse.json({ error: 'Input and brandId are required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Verify that the brand belongs to the logged-in user
    const existingBrand = await prisma.brand.findUnique({
      where: { id: brandId, userId: session.user.id },
    });

    if (!existingBrand) {
      return new NextResponse('Brand not found or unauthorized', { status: 404 });
    }

    const truncatedInput = input.substring(0, 1000); // Truncate input to 1000 characters
    const prompt = `Generate 4-5 catchy slogans for a brand described as: "${truncatedInput}". Return the response as a JSON array of strings.`;

    const result = await callGeminiAPI(prompt);

    // Update the brand in the database
    await prisma.brand.update({
      where: { id: brandId },
      data: {
        slogans: result, // Store the array of slogans
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
