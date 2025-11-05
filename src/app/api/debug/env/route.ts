
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  return NextResponse.json({
    message: 'This endpoint reveals the GOOGLE_CLIENT_ID being used by the Vercel runtime environment.',
    googleClientIdFromEnv: clientId || 'NOT SET',
  });
}
