import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!); // Ensure GEMINI_API_KEY is set

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { brandId, mood, audience } = await req.json();

    if (!brandId) {
      return NextResponse.json(
        { error: "Brand ID is required." },
        { status: 400 }
      );
    }

    // Verify that the brand belongs to the logged-in user
    const existingBrand = await prisma.brand.findUnique({
      where: { id: brandId, userId: session.user.id },
      include: { 
        // Include relevant brand data for context
        mission: true, vision: true, personalityTraits: true,
      }
    });

    if (!existingBrand) {
      return new NextResponse("Brand not found or unauthorized", { status: 404 });
    }

    // TODO: Construct a detailed prompt for Gemini based on brand data, mood, and audience
    const prompt = `
      Generate 2-3 typography pairings (e.g., heading font, body font) for the following brand.
      Consider the brand's mission, vision, and personality traits.
      Desired mood: ${mood || "professional"}.
      Target audience: ${audience || "general"}.

      Brand Name: ${existingBrand.name}
      ${existingBrand.mission ? `Mission: ${existingBrand.mission}` : ''}
      ${existingBrand.vision ? `Vision: ${existingBrand.vision}` : ''}
      ${existingBrand.personalityTraits ? `Personality Traits: ${JSON.stringify(existingBrand.personalityTraits)}` : ''}

      For each pairing, suggest:
      - A primary font (for headings)
      - A secondary font (for body text)
      - A brief rationale for the pairing

      Return the response as a JSON array of objects, where each object represents a typography pairing.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Using gemini-1.5-pro for detailed generation

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const parsed = JSON.parse(text);

    await prisma.brand.update({
      where: { id: brandId },
      data: {
        typographyPairings: parsed,
      },
    });

    return NextResponse.json({ brandId, typographyPairings: parsed });
  } catch (error: any) {
    console.error("❌ Error generating typography pairings:", error);
    return NextResponse.json(
      { error: error.message || "Gemini typography generation failed." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}