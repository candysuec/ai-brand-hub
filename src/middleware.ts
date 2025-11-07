import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Admin Access Middleware
 * -----------------------
 * Protects /admin routes (e.g. /admin/selfrepair)
 * You can extend this to integrate with NextAuth or your own auth logic.
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard admin routes
  if (pathname.startsWith("/admin")) {
    // Simple token-based auth check (can be replaced with NextAuth session)
    const authHeader = request.headers.get("authorization");
    const adminKey = process.env.ADMIN_ACCESS_KEY;

    // If no env key defined, allow local dev
    if (!adminKey) {
      console.warn("⚠️ No ADMIN_ACCESS_KEY set — skipping auth check.");
      return NextResponse.next();
    }

    if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
      return new NextResponse("Unauthorized: invalid admin access key", {
        status: 401,
      });
    }
  }

  return NextResponse.next();
}

// Limit middleware to these paths
export const config = {
  matcher: ["/admin/:path*"],
};
