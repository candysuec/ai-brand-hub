import { PrismaClient } from '@prisma/client'; // Import PrismaClient
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function POST(req: Request) {
  const prisma = new PrismaClient(); // Instantiate PrismaClient
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { name, description } = await req.json();
    const brand = await prisma.brand.create({
      data: {
        name,
        description,
        userId: session.user.id,
      },
    });
    return NextResponse.json(brand);
  } catch (error) {
    console.error('[BRANDS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function GET() {
    const prisma = new PrismaClient(); // Instantiate PrismaClient
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const brands = await prisma.brand.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: 'desc',
            }
        });
        return NextResponse.json(brands);
    } catch (error) {
        console.error('[BRANDS_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
