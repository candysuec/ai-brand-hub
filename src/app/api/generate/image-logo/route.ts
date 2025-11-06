import { GoogleGenerativeAI, Content } from "@google/generative-ai"; // Import Content
import { NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client'; // Import PrismaClient

// ✅ Load your Gemini API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const prisma = new PrismaClient(); // Instantiate PrismaClient
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { idea, brandId } = await req.json();

    // ✅ Safety: Ensure valid input
    if (!idea) {
      return NextResponse.json({ error: "Missing logo idea." }, { status: 400 });
    }

    // Verify that the brand belongs to the logged-in user
    const existingBrand = await prisma.brand.findUnique({
      where: { id: brandId, userId: session.user.id },
    });

    if (!existingBrand) {
      return new NextResponse('Brand not found or unauthorized', { status: 404 });
    }

    // ✅ Trim long ideas to avoid token limit errors
    const trimmedIdea = idea.slice(0, 400); // keeps it under ~2KB of tokens

    // ✅ Create a clear, concise prompt
    const prompt = `
      Generate a modern logo concept for the following idea:
      "${trimmedIdea}"
      
      Style: clean, professional, visually balanced.
      Output: a single logo image that represents the concept creatively.
    `;

    // ✅ Call Gemini image generation model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" }, { apiVersion: 'v1beta' });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    // ✅ Extract image URL from the response
    const imagePart = result.response.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart || !imagePart.inlineData) { // Add check for inlineData
      return NextResponse.json(
        { error: "No image was generated or inlineData is missing." }, // Update error message
        { status: 500 }
      );
    }

    // ✅ Convert image data to a URL
    const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

    // ✅ Save to your database
    await prisma.brand.update({
      where: { id: brandId },
      data: { generatedLogoImage: imageUrl },
    });

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Error generating logo image:", error);
    return NextResponse.json(
      { error: "Failed to generate logo image." },
      { status: 500 }
    );
  }
}
