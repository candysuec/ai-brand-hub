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

    // Verify that the brand belongs to the logged-in user
    const existingBrand = await prisma.brand.findUnique({
      where: { id: brandId, userId: session.user.id },
    });

    if (!existingBrand) {
      return new NextResponse("Brand not found or unauthorized", { status: 404 });
    }

    const { brandId, answers } = await req.json(); // 'answers' will be the input from the discovery wizard

    const prompt = `
      Based on the following brand discovery answers, generate a comprehensive brand DNA:
      ${JSON.stringify(answers, null, 2)}

      Include: mission, vision, 3-4 core values, target audience description, unique selling proposition, and brand personality traits.
      Return the response as a JSON object with keys: mission, vision, values (array of strings), targetAudience, usp, personalityTraits (array of strings).
    `;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash", // Changed model
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const response = await result.response;
    const text = response.text();

    const parsed = JSON.parse(text);

    await prisma.brand.update({
      where: { id: brandId },
      data: {
        mission: parsed.mission,
        vision: parsed.vision,
        values: parsed.values,
        targetAudience: parsed.targetAudience,
        usp: parsed.usp,
        personalityTraits: parsed.personalityTraits,
      },
    });

    return NextResponse.json({ brandId, brandDNA: parsed });
  } catch (error: any) {
    console.error("❌ Error generating brand discovery:", error);
    return NextResponse.json(
      { error: error.message || "Gemini brand discovery generation failed." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
