import { NextResponse } from "next/server";
import { sendAlert } from "@/lib/alerts/mailer";

export const runtime = "nodejs";

/**
 * Hourly Self-Repair Cron
 * -----------------------
 * Runs every hour (triggered by a system scheduler or external cron)
 * to check for recurring JWT session errors.
 *
 * Deploy note:
 *  - On Vercel: use Cron Job → every 1h
 *  - Locally: curl http://localhost:3002/api/generate/selfrepair/cron/hourly
 */
export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3002"}/api/generate/selfrepair`, {
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_ACCESS_KEY || ""}`,
      },
      cache: "no-store",
    });
    const data = await res.json();

    const jwtStatus = data.jwt || data.checks?.jwtSession?.message || "";

    // Detect escalation
    if (jwtStatus.includes("❌") || jwtStatus.includes("Critical")) {
      await sendAlert("error", "Hourly Watchdog: NextAuth Session Failure", {
        message: "Repeated JWT_SESSION_ERROR (decryption failed).",
        advice: "Verify NEXTAUTH_SECRET consistency and clear cookies.",
        time: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      checked: new Date().toISOString(),
      jwt: jwtStatus,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
