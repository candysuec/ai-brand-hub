import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const brandId = params.id;

    // Verify that the brand belongs to the logged-in user
    const existingBrand = await prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!existingBrand) {
      return new NextResponse('Brand not found', { status: 404 });
    }

    if (existingBrand.userId !== session.user.id) {
      return new NextResponse('Unauthorized to delete this brand', { status: 403 });
    }

    await prisma.brand.delete({
      where: { id: brandId },
    });

    return new NextResponse(null, { status: 204 }); // No Content
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const brandId = params.id;
    const { name, description } = await req.json();

    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
    }

    // Verify that the brand belongs to the logged-in user
    const existingBrand = await prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!existingBrand) {
      return new NextResponse('Brand not found', { status: 404 });
    }

    if (existingBrand.userId !== session.user.id) {
      return new NextResponse('Unauthorized to update this brand', { status: 403 });
    }

    const updatedBrand = await prisma.brand.update({
      where: { id: brandId },
      data: { name, description },
    });

    return NextResponse.json(updatedBrand);
  } catch (error) {
    console.error('Error updating brand:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}