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
      Generate a comprehensive tone guide for the following brand, incorporating all provided information.
      The tone guide should define the brand's voice and tone, including:
      - Overall brand personality (e.g., authoritative, playful, empathetic)
      - Key adjectives to describe the tone
      - Examples of how to apply the tone in different contexts (e.g., website, social media, customer service)
      - Things to avoid (e.g., jargon, overly casual language)

      Brand Information: ${JSON.stringify(existingBrand, null, 2)}

      Return the response as a Markdown formatted string, suitable for direct display.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Changed model

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // The tone guide will be a long string, so we'll store it as a String? in the database
    await prisma.brand.update({
      where: { id: brandId },
      data: {
        toneGuide: text,
      },
    });

    return NextResponse.json({ brandId, toneGuide: text });
  } catch (error: any) {
    console.error("❌ Error generating tone guide:", error);
    return NextResponse.json(
      { error: error.message || "Gemini tone guide generation failed." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
