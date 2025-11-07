import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const usageRecords = await prisma.usageRecord.findMany({
      where: { userId: session.user.id },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json(usageRecords);
  } catch (error: any) {
    console.error("Error fetching usage records:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage records." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { feature, count } = await req.json();

    if (!feature) {
      return NextResponse.json(
        { error: "Feature is required." },
        { status: 400 }
      );
    }

    const newUsageRecord = await prisma.usageRecord.create({
      data: {
        userId: session.user.id,
        feature,
        count: count || 1,
      },
    });

    return NextResponse.json(newUsageRecord, { status: 201 });
  } catch (error: any) {
    console.error("Error creating usage record:", error);
    return NextResponse.json(
      { error: "Failed to create usage record." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}