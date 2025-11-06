import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth"; // adjust if your auth file is in a different folder

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (e) {
      console.error("Error in getServerSession:", e);
    }
    console.log("Session in /api/brands:", session);

    let userId = session?.user?.id;

    if (!userId && session?.user?.email) {
      const userRecord = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      userId = userRecord?.id ?? undefined;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User not authenticated or not found" },
        { status: 401 }
      );
    }

    const brands = await prisma.brand.findMany({
      where: {
        userId: userId,
      },
    });

    return NextResponse.json(brands, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching brands." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session data:", session);

    // Try to get userId from session, fallback to lookup by email
    let userId = session?.user?.id;

    if (!userId && session?.user?.email) {
      const userRecord = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      // ✅ Use undefined instead of null to avoid TypeScript error
      userId = userRecord?.id ?? undefined;
    }

    // If still no userId, return error
    if (!userId) {
      return NextResponse.json(
        { error: "User not authenticated or not found" },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    // Create the brand in the database
    const newBrand = await prisma.brand.create({
      data: {
        name,
        description: description || "",
        userId,
      },
    });

    return NextResponse.json(newBrand, { status: 201 });
  } catch (error: any) {
    console.error("Error creating brand:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the brand." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
