import { NextResponse } from "next/server";
import { runSelfRepair } from "@/lib/selfrepair";
import { sendDailySummary } from "@/lib/daily";
import { archiveLogs, pruneLogs } from "@/lib/logs";

export const runtime = "nodejs";

/**
 * Unified Cron Job
 * ----------------
 * Runs once per day (00:00 UTC).
 * - Performs hourly self-repair (now daily).
 * - Performs daily summary & email.
 * - Archives and prunes logs.
 */
export async function GET() {
  try {
    console.log("🔁 Daily maintenance cycle started");

    // 1️⃣ Run health and repair
    await runSelfRepair();

    // 2️⃣ Archive & prune logs
    await archiveLogs();
    await pruneLogs();

    // 3️⃣ Send daily summary
    await sendDailySummary();

    console.log("✅ Daily maintenance cycle complete");
    return NextResponse.json({ ok: true, ranDaily: true });
  } catch (error: any) {
    console.error("❌ Unified Daily Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}