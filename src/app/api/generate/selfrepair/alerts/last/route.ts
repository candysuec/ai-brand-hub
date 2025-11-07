import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * /api/generate/selfrepair/alerts/last
 * -------------------------------------
 * Returns the most recent alert record from /logs/lastAlert.json
 */

export async function GET() {
  try {
    const logDir = path.join(process.cwd(), "logs");
    const alertFile = path.join(logDir, "lastAlert.json");

    if (!fs.existsSync(alertFile)) {
      return NextResponse.json({ message: "No alerts sent yet." });
    }

    const data = JSON.parse(fs.readFileSync(alertFile, "utf8"));
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
