import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth"; // adjust if your auth file is in a different folder

const prisma = new PrismaClient();

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
      userId = userRecord?.id || null;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized — user not found or missing ID" },
        { status: 401 }
      );
    }

    const { name, description } = await req.json();

    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        description,
        userId,
      },
    });

    return NextResponse.json({ success: true, brand });
  } catch (error: any) {
    console.error("[BRANDS_POST]", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
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
      userId = userRecord?.id || null;
    }

    if (!userId) {
      // Always return an empty array so UI doesn't crash
      return NextResponse.json([]);
    }

    const brands = await prisma.brand.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(brands);
  } catch (error: any) {
    console.error("[BRANDS_GET]", error);
    return NextResponse.json([]);
  }
}
