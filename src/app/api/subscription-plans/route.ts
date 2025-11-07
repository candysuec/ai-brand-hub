import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany();
    return NextResponse.json(plans);
  } catch (error: any) {
    console.error("Error fetching subscription plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription plans." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: Request) {
  try {
    const { name, description, price, currency, features, stripeProductId, stripePriceId } = await req.json();

    if (!name || !price) {
      return NextResponse.json(
        { error: "Name and price are required." },
        { status: 400 }
      );
    }

    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        price,
        currency,
        features,
        stripeProductId,
        stripePriceId,
      },
    });

    return NextResponse.json(newPlan, { status: 201 });
  } catch (error: any) {
    console.error("Error creating subscription plan:", error);
    return NextResponse.json(
      { error: "Failed to create subscription plan." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}