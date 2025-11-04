import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Check if a user already exists
    let user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    // If not, create a new user
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
        },
      });
    }

    // Return the user
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('[TEST_USER_GET]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}