
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;

  return NextResponse.json({
    message: 'This endpoint reveals key environment variables.',
    googleClientIdFromEnv: clientId || 'NOT SET',
    nextAuthUrlFromEnv: nextAuthUrl || 'NOT SET',
    nextAuthSecretFromEnv: nextAuthSecret || 'NOT SET',
  });
}
