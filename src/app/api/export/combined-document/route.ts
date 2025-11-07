import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json(
        { error: "Brand ID is required." },
        { status: 400 }
      );
    }

    // Verify that the brand belongs to the logged-in user and fetch all relevant data
    const existingBrand = await prisma.brand.findUnique({
      where: { id: brandId, userId: session.user.id },
      select: {
        name: true,
        description: true,
        brandBook: true,
        toneGuide: true,
        contentPillars: true,
        mission: true,
        vision: true,
        values: true,
        targetAudience: true,
        usp: true,
        personalityTraits: true,
        messagingMatrix: true,
        slogans: true,
        colorPalettes: true,
        logoIdeas: true,
        generatedLogoImage: true,
        postIdeas: true,
      },
    });

    if (!existingBrand) {
      return new NextResponse("Brand not found or unauthorized", { status: 404 });
    }

    let combinedDocument = `# Brand: ${existingBrand.name}\n\n`;
    combinedDocument += `## Description\n${existingBrand.description || "N/A"}\n\n`;

    if (existingBrand.mission || existingBrand.vision || existingBrand.values) {
      combinedDocument += `## Brand DNA\n\n`;
      if (existingBrand.mission) combinedDocument += `### Mission\n${existingBrand.mission}\n\n`;
      if (existingBrand.vision) combinedDocument += `### Vision\n${existingBrand.vision}\n\n`;
      if (existingBrand.values) combinedDocument += `### Values\n${(existingBrand.values as string[]).map(v => `- ${v}`).join("\n")}\n\n`;
      if (existingBrand.targetAudience) combinedDocument += `### Target Audience\n${existingBrand.targetAudience}\n\n`;
      if (existingBrand.usp) combinedDocument += `### Unique Selling Proposition\n${existingBrand.usp}\n\n`;
      if (existingBrand.personalityTraits) combinedDocument += `### Personality Traits\n${(existingBrand.personalityTraits as string[]).map(p => `- ${p}`).join("\n")}\n\n`;
    }

    if (existingBrand.messagingMatrix) {
      combinedDocument += `## Messaging Matrix\n\n`;
      const mm = existingBrand.messagingMatrix as any;
      if (mm.masterTagline) combinedDocument += `### Master Tagline\n${mm.masterTagline}\n\n`;
      if (mm.elevatorPitch) {
        combinedDocument += `### Elevator Pitch\n`;
        if (mm.elevatorPitch["15s"]) combinedDocument += `15s: ${mm.elevatorPitch["15s"]}\n`;
        if (mm.elevatorPitch["30s"]) combinedDocument += `30s: ${mm.elevatorPitch["30s"]}\n`;
        if (mm.elevatorPitch["60s"]) combinedDocument += `60s: ${mm.elevatorPitch["60s"]}\n`;
        combinedDocument += `\n`;
      }
      if (mm.boilerplate) combinedDocument += `### Boilerplate\n${mm.boilerplate}\n\n`;
      if (mm.benefitStack) {
        combinedDocument += `### Benefit Stack\n`;
        mm.benefitStack.forEach((b: any) => combinedDocument += `- **${b.title}**: ${b.description}\n`);
        combinedDocument += `\n`;
      }
      if (mm.narrativeThemes) combinedDocument += `### Narrative Themes\n${(mm.narrativeThemes as string[]).map(t => `- ${t}`).join("\n")}\n\n`;
      if (mm.sayDontSay) {
        combinedDocument += `### Say/Don\'t Say\n`;
        if (mm.sayDontSay.say) combinedDocument += `**Say:**\n${(mm.sayDontSay.say as string[]).map(s => `- ${s}`).join("\n")}\n`;
        if (mm.sayDontSay.dontSay) combinedDocument += `**Don\'t Say:**\n${(mm.sayDontSay.dontSay as string[]).map(s => `- ${s}`).join("\n")}\n`;
        combinedDocument += `\n`;
      }
    }

    if (existingBrand.slogans && (existingBrand.slogans as string[]).length > 0) {
      combinedDocument += `## Slogans\n\n`;
      combinedDocument += (existingBrand.slogans as string[]).map(s => `- ${s}`).join("\n") + "\n\n";
    }

    if (existingBrand.colorPalettes && (existingBrand.colorPalettes as any[]).length > 0) {
      combinedDocument += `## Color Palettes\n\n`;
      (existingBrand.colorPalettes as any[]).forEach((palette, index) => {
        combinedDocument += `### Palette ${index + 1}\n`;
        palette.colors.forEach((color: any) => {
          combinedDocument += `- ${color.name}: ${color.hex} (RGB: ${color.rgb})\n`;
        });
        combinedDocument += `\n`;
      });
    }

    if (existingBrand.logoIdeas && (existingBrand.logoIdeas as any[]).length > 0) {
      combinedDocument += `## Logo Ideas\n\n`;
      (existingBrand.logoIdeas as any[]).forEach((idea, index) => {
        combinedDocument += `### Idea ${index + 1}\n`;
        combinedDocument += `Description: ${idea.description}\n`;
        combinedDocument += `Keywords: ${idea.keywords.join(", ")}\n`;
        combinedDocument += `\n`;
      });
    }

    if (existingBrand.generatedLogoImage) {
      combinedDocument += `## Generated Logo Image\n\n`;
      combinedDocument += `(Image data is too large to embed directly in text export, but is available in the system.)\n\n`;
    }

    if (existingBrand.brandBook) {
      combinedDocument += `## Brand Book\n\n`;
      combinedDocument += existingBrand.brandBook + "\n\n";
    }

    if (existingBrand.toneGuide) {
      combinedDocument += `## Tone Guide\n\n`;
      combinedDocument += existingBrand.toneGuide + "\n\n";
    }

    if (existingBrand.contentPillars && (existingBrand.contentPillars as any[]).length > 0) {
      combinedDocument += `## Content Pillars\n\n`;
      (existingBrand.contentPillars as any[]).forEach((pillar, index) => {
        combinedDocument += `### Pillar ${index + 1}: ${pillar.title}\n`;
        combinedDocument += `Description: ${pillar.description}\n`;
        combinedDocument += `Topics: ${pillar.topics.join(", ")}\n`;
        combinedDocument += `Connection to Brand: ${pillar.connectionToBrand}\n`;
        combinedDocument += `\n`;
      });
    }

    if (existingBrand.postIdeas && (existingBrand.postIdeas as any[]).length > 0) {
      combinedDocument += `## Post Ideas\n\n`;
      (existingBrand.postIdeas as any[]).forEach((idea, index) => {
        combinedDocument += `### Post Idea ${index + 1}: ${idea.headline}\n`;
        combinedDocument += `Content: ${idea.description}\n`;
        combinedDocument += `CTA: ${idea.cta}\n`;
        combinedDocument += `Hashtags: ${idea.hashtags.join(", ")}\n`;
        combinedDocument += `Platform(s): ${idea.targetPlatforms.join(", ")}\n`;
        combinedDocument += `\n`;
      });
    }

    return new NextResponse(combinedDocument, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="${existingBrand.name.replace(/\s/g, "_")}_Brand_Document.md"`,
      },
    });
  } catch (error: any) {
    console.error("❌ Error generating combined document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate combined document." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
