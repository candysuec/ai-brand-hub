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

    const { brandId, brandDNA } = await req.json(); // 'brandDNA' will be the input from the brand discovery

    if (!brandId || !brandDNA) {
      return NextResponse.json(
        { error: "Brand ID and brand DNA are required." },
        { status: 400 }
      );
    }

    // Verify that the brand belongs to the logged-in user
    const existingBrand = await prisma.brand.findUnique({
      where: { id: brandId, userId: session.user.id },
    });

    if (!existingBrand) {
      return new NextResponse("Brand not found or unauthorized", { status: 404 });
    }

    // TODO: Construct a detailed prompt for Gemini based on 'brandDNA'
    const prompt = `
      Given the following brand DNA, generate a comprehensive messaging matrix.
      The messaging matrix should include:
      - Master Tagline
      - Elevator Pitch (15, 30, and 60 seconds)
      - Boilerplate description
      - Benefit Stack (3-5 key benefits with descriptions)
      - Narrative Themes (3-5 overarching stories or messages)
      - Say/Don't Say (guidelines for language use)

      Brand DNA: ${JSON.stringify(brandDNA, null, 2)}

      Return the response as a JSON object with keys: masterTagline, elevatorPitch (object with 15s, 30s, 60s keys), boilerplate, benefitStack (array of objects with title and description), narrativeThemes (array of strings), sayDontSay (object with say and dontSay arrays of strings).
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Changed model

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const parsed = JSON.parse(text);

    await prisma.brand.update({
      where: { id: brandId },
      data: {
        messagingMatrix: parsed,
      },
    });

    return NextResponse.json({ brandId, messagingMatrix: parsed });
  } catch (error: any) {
    console.error("❌ Error generating messaging matrix:", error);
    return NextResponse.json(
      { error: error.message || "Gemini messaging matrix generation failed." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
