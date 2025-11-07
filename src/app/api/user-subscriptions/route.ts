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

    const subscriptions = await prisma.userSubscription.findMany({
      where: { userId: session.user.id },
      include: { plan: true },
    });

    return NextResponse.json(subscriptions);
  } catch (error: any) {
    console.error("Error fetching user subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch user subscriptions." },
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

    const { planId, stripeSubscriptionId } = await req.json();

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required." },
        { status: 400 }
      );
    }

    const newSubscription = await prisma.userSubscription.create({
      data: {
        userId: session.user.id,
        planId,
        stripeSubscriptionId,
      },
    });

    return NextResponse.json(newSubscription, { status: 201 });
  } catch (error: any) {
    console.error("Error creating user subscription:", error);
    return NextResponse.json(
      { error: "Failed to create user subscription." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}