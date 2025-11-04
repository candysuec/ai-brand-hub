import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: userId } = await context.params;

    // Ensure the user is trying to delete their own account
    if (session.user.id !== userId) {
      return new NextResponse('Unauthorized to delete this user account', { status: 403 });
    }

    // Delete the user and all their associated brands (due to onDelete: Cascade in schema.prisma)
    await prisma.user.delete({
      where: { id: userId },
    });

    return new NextResponse(null, { status: 204 }); // No Content
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
