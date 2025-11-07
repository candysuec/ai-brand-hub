import { NextResponse } from "next/server";
import { sendAlert } from "@/lib/alerts/mailer";

/**
 * /api/generate/selfrepair/alert-test
 * ------------------------------------
 * Manually trigger a test alert email.
 * Requires valid API key (same as admin access).
 */

export async function GET(request: Request) {
  try {
    const auth = request.headers.get("authorization");
    const key =
      auth && auth.startsWith("Bearer ") ? auth.replace("Bearer ", "") : null;
    if (!key || key !== process.env.ADMIN_ACCESS_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await sendAlert("info", "📧 Test Alert Successful", {
      message:
        "This is a test alert from your AI Brand Hub self-repair system.",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      provider: process.env.ALERTS_PROVIDER || "resend",
    });

    return NextResponse.json({
      success: true,
      sentTo: process.env.ALERTS_TO,
      provider: process.env.ALERTS_PROVIDER || "resend",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
