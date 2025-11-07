import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai"; // Changed import
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }); // Changed instantiation

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { brandId } = await req.json();

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
        // Include all relevant brand data for context
        mission: true, vision: true, values: true, targetAudience: true, usp: true, personalityTraits: true,
        messagingMatrix: true, slogans: true, colorPalettes: true, logoIdeas: true, generatedLogoImage: true,
      }
    });

    if (!existingBrand) {
      return new NextResponse("Brand not found or unauthorized", { status: 404 });
    }

    // TODO: Construct a detailed prompt for Gemini based on all available brand data
    const prompt = `
      Generate a comprehensive brand book for the following brand, incorporating all provided information.
      The brand book should include sections for:
      - Brand Overview (Mission, Vision, Values)
      - Brand Identity (Logo Usage, Color Palette, Typography - if available)
      - Brand Voice & Messaging (Master Tagline, Elevator Pitch, Boilerplate, Key Messages, Say/Don't Say)
      - Target Audience
      - Unique Selling Proposition
      - Brand Personality
      - Slogans
      - Imagery Guidelines (based on logo ideas or generated image)

      Brand Information: ${JSON.stringify(existingBrand, null, 2)}

      Return the response as a Markdown formatted string, suitable for direct display or conversion to PDF.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Changed model

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // The brand book will be a long string, so we'll store it as a String? in the database
    await prisma.brand.update({
      where: { id: brandId },
      data: {
        brandBook: text,
      },
    });

    return NextResponse.json({ brandId, brandBook: text });
  } catch (error: any) {
    console.error("❌ Error generating brand book:", error);
    return NextResponse.json(
      { error: error.message || "Gemini brand book generation failed." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
