import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    });

    if (!existingBrand) {
      return new NextResponse("Brand not found or unauthorized", { status: 404 });
    }

    const results: { [key: string]: any } = {};

    // 1. Generate Brand Discovery (DNA)
    const brandDiscoveryRes = await fetch("http://localhost:3002/api/generate/brand-discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId, answers: { description: existingBrand.description, name: existingBrand.name } }),
    });
    results.brandDiscovery = await brandDiscoveryRes.json();

    // 2. Generate Messaging Matrix (requires brand DNA)
    const messagingMatrixRes = await fetch("http://localhost:3002/api/generate/messaging-matrix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId, brandDNA: results.brandDiscovery.brandDNA }),
    });
    results.messagingMatrix = await messagingMatrixRes.json();

    // 3. Generate Post Ideas (requires brand DNA and messaging matrix)
    const postIdeasRes = await fetch("http://localhost:3002/api/generate/post-ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId, topics: ["marketing", "product launch"], platforms: ["instagram", "twitter"] }),
    });
    results.postIdeas = await postIdeasRes.json();

    // 4. Generate Brand Book
    const brandBookRes = await fetch("http://localhost:3002/api/generate/brand-book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId }),
    });
    results.brandBook = await brandBookRes.json();

    // 5. Generate Tone Guide
    const toneGuideRes = await fetch("http://localhost:3002/api/generate/tone-guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId }),
    });
    results.toneGuide = await toneGuideRes.json();

    // 6. Generate Content Pillars
    const contentPillarsRes = await fetch("http://localhost:3002/api/generate/content-pillars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId }),
    });
    results.contentPillars = await contentPillarsRes.json();

    return NextResponse.json({ brandId, status: "All generations triggered", results });
  } catch (error: any) {
    console.error("❌ Error generating all brand assets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate all brand assets." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}