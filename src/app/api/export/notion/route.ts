import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'; // Import PrismaClient
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { Client } from '@notionhq/client'; // Need to install @notionhq/client

export async function POST(req: NextRequest) {
  const prisma = new PrismaClient(); // Instantiate PrismaClient
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { brandId, notionPageId, content } = await req.json();

    if (!brandId || !content) {
      return NextResponse.json({ error: 'Brand ID and content are required' }, { status: 400 });
    }

    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
      return NextResponse.json({ error: 'Notion API key or Database ID not configured' }, { status: 500 });
    }

    // Verify that the brand belongs to the logged-in user
    const existingBrand = await prisma.brand.findUnique({
      where: { id: brandId, userId: session.user.id },
    });

    if (!existingBrand) {
      return new NextResponse('Brand not found or unauthorized', { status: 404 });
    }

    const notion = new Client({ auth: process.env.NOTION_API_KEY });

    let pageIdToUpdate = notionPageId || existingBrand.notionPageId;

    if (!pageIdToUpdate) {
      // Create a new page if no pageId is provided or stored
      const newPage = await notion.pages.create({
        parent: { database_id: process.env.NOTION_DATABASE_ID },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: existingBrand.name,
                },
              },
            ],
          },
        },
        children: [
          {
            object: 'block',
            type: 'heading_3',
            heading_3: {
              rich_text: [{ type: 'text', text: { content: content.type || 'Content' } }],
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: content.data || 'No content provided' } }],
            },
          },
        ],
      });
      pageIdToUpdate = newPage.id;

      // Update the brand with the new Notion page ID
      await prisma.brand.update({
        where: { id: brandId },
        data: { notionPageId: pageIdToUpdate },
      });
    } else {
      // Update existing page (simplified: just append content for now)
      await notion.blocks.children.append({
        block_id: pageIdToUpdate,
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: `Updated Brand Identity - ${new Date().toLocaleString()}` } }],
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: content.mission || 'No Mission Statement' } }],
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: content.vision || 'No Vision Statement' } }],
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: content.values || 'No Core Values' } }],
            },
          },
        ],
      });
    }

    return NextResponse.json({ notionPageId: pageIdToUpdate });
  } catch (error) {
    console.error('Error exporting to Notion:', error);
    return NextResponse.json({ error: 'Failed to export to Notion.' }, { status: 500 });
  }
}
