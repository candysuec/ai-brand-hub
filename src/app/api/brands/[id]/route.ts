import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'; // Import PrismaClient
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const prisma = new PrismaClient();
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const brand = await prisma.brand.findUnique({
      where: { id: id as string },
    });

    if (!brand) {
      return new NextResponse('Brand not found', { status: 404 });
    }

    if (brand.userId !== session.user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    return NextResponse.json(brand);
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const prisma = new PrismaClient(); // Instantiate PrismaClient
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const brand = await prisma.brand.findUnique({
      where: { id: id as string },
    });

    if (!brand) {
      return new NextResponse('Brand not found', { status: 404 });
    }

    if (brand.userId !== session.user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    await prisma.brand.delete({ where: { id } });
    return NextResponse.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const prisma = new PrismaClient(); // Instantiate PrismaClient
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { name, description } = await req.json();

    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
    }

    // Verify that the brand belongs to the logged-in user
    const existingBrand = await prisma.brand.findUnique({
      where: { id: id as string },
    });

    if (!existingBrand) {
      return new NextResponse('Brand not found', { status: 404 });
    }

    if (existingBrand.userId !== session.user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const updatedBrand = await prisma.brand.update({
      where: { id },
      data: { name, description },
    });

    return NextResponse.json(updatedBrand);
  } catch (error) {
    console.error('Error updating brand:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}