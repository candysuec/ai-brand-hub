// src/app/api/generate/selfrepair/route.ts
import { NextResponse } from "next/server";
import { runSelfRepair } from "@/lib/selfrepair";

export const runtime = "nodejs"; // Node runtime required for fs operations within runSelfRepair

/**
 * Self-Repair API Endpoint
 * ------------------------
 * Triggers the self-repair process, either in dry run or repair mode.
 * Accessible from the dashboard or internal calls.
 *
 * Use GET for read-only status and POST to initiate repair.
 */

// This GET is for reporting current status, not for initiating full repair/scan as before.
export async function GET(request: Request) {
  // A simple GET could return a placeholder or just trigger a read-only runSelfRepair
  // For now, let's keep it simple and just return a status
  return NextResponse.json({
    message: "Self-repair API endpoint. Use POST for actions, or specific sub-routes for status.",
    timestamp: new Date().toISOString(),
  });
}


export async function POST(request: Request) {
  const url = new URL(request.url);
  const dryrun = url.searchParams.get("dryrun") === "true";
  const repair = url.searchParams.get("repair") === "true";

  try {
    const result = await runSelfRepair(dryrun, repair);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[/api/generate/selfrepair POST Error]", error);
    return NextResponse.json(
      { status: "error", message: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
