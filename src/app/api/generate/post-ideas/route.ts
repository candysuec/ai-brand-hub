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

    const { brandId, topics, platforms } = await req.json(); // 'topics' and 'platforms' will be input for post ideas

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
        // Include brand DNA and messaging matrix for context
        // This assumes these fields are already populated
        // mission: true, vision: true, values: true, targetAudience: true, usp: true, personalityTraits: true,
        // messagingMatrix: true,
      }
    });

    if (!existingBrand) {
      return new NextResponse("Brand not found or unauthorized", { status: 404 });
    }

    // TODO: Construct a detailed prompt for Gemini based on existingBrand, topics, and platforms
    const prompt = `
      Given the following brand information, generate 5 unique social media post ideas.
      Focus on the following topics: ${topics ? topics.join(', ') : 'general brand awareness'}.
      Target platforms: ${platforms ? platforms.join(', ') : 'all major social media platforms'}.

      Brand Name: ${existingBrand.name}
      Brand Description: ${existingBrand.description}
      ${existingBrand.mission ? `Mission: ${existingBrand.mission}` : ''}
      ${existingBrand.vision ? `Vision: ${existingBrand.vision}` : ''}
      ${existingBrand.values ? `Values: ${JSON.stringify(existingBrand.values)}` : ''}
      ${existingBrand.targetAudience ? `Target Audience: ${existingBrand.targetAudience}` : ''}
      ${existingBrand.usp ? `Unique Selling Proposition: ${existingBrand.usp}` : ''}
      ${existingBrand.personalityTraits ? `Personality Traits: ${JSON.stringify(existingBrand.personalityTraits)}` : ''}
      ${existingBrand.messagingMatrix ? `Messaging Matrix: ${JSON.stringify(existingBrand.messagingMatrix)}` : ''}

      For each post idea, provide:
      - A catchy headline
      - A brief description of the post content
      - Suggested call to action (CTA)
      - Relevant hashtags (3-5)
      - Target platform(s)

      Return the response as a JSON array of objects, where each object represents a post idea.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Changed model

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const parsed = JSON.parse(text);

    await prisma.brand.update({
      where: { id: brandId },
      data: {
        postIdeas: parsed,
      },
    });

    return NextResponse.json({ brandId, postIdeas: parsed });
  } catch (error: any) {
    console.error("❌ Error generating post ideas:", error);
    return NextResponse.json(
      { error: error.message || "Gemini post ideas generation failed." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
