import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

// This is a placeholder for the actual Gemini API client.
// In a real application, you would use the official Google AI SDK.
const callGeminiAPI = async (prompt: string) => {
  // In a real scenario, you would make a fetch request to the Gemini API endpoint.
  // For example:
  // const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  // });
  // const data = await response.json();
  // const content = data.candidates[0].content.parts[0].text;
  // return JSON.parse(content);

  // For this simulation, we'll just return a mocked response after a short delay.
  await new Promise(resolve => setTimeout(resolve, 1500));

  // The AI's response should be a JSON object with the expected keys.
  const mockApiResponse = {
    mission: `To provide high-quality, ethically sourced coffee and a welcoming community space for the neighborhood, based on the idea of '${prompt}'.`,
    vision: `To become the leading local hub for coffee lovers, known for our commitment to sustainability, community engagement, and the perfect cup of coffee, inspired by '${prompt}'.`,
    values: `Quality, Community, Sustainability, and Passion, all centered around '${prompt}'.`
  };

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
    const prompt = `Given the following brand description, generate a mission statement, a vision statement, and a list of 3-4 core values. Return the response as a JSON object with the keys "mission", "vision", and "values".\n\nDescription: "${truncatedInput}"`;

    const result = await callGeminiAPI(prompt);

    // Update the brand in the database
    await prisma.brand.update({
      where: { id: brandId },
      data: {
        mission: result.mission,
        vision: result.vision,
        values: result.values,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
