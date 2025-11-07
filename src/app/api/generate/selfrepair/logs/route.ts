import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Self-Repair Logs API (Auditable + Auto-Rotation + Daily Backups)
 * ----------------------------------------------------------------
 * - GET: Returns latest logs
 * - POST: Adds new log entry
 *   - Tracks IP + hashed key
 *   - Keeps only last 200 entries
 *   - Creates daily archive snapshot (once per day)
 */

export const runtime = "nodejs";

const logDir = path.join(process.cwd(), "logs");
const archiveDir = path.join(logDir, "archive");
const logFile = path.join(logDir, "selfrepair-log.json");
const MAX_LOGS = 200; // keep 200 most recent entries
const RETENTION_DAYS = 30; // cleanup threshold

function ensureDirs() {
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
  if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, "[]", "utf8");
}

// Simple SHA-256 short hash
function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

// Create daily snapshot archive (once per date)
function createDailyBackup() {
  try {
    ensureDirs();
    const today = new Date().toISOString().split("T")[0];
    const archivePath = path.join(archiveDir, `${today}.json`);

    if (!fs.existsSync(archivePath)) {
      const logs = JSON.parse(fs.readFileSync(logFile, "utf8"));
      fs.writeFileSync(archivePath, JSON.stringify(logs, null, 2), "utf8");
      console.log(`🗄️ Created daily log backup: ${archivePath}`);
    }
  } catch (err) {
    console.warn("⚠️ Failed to create daily backup:", err);
  }
}

function cleanupOldArchives() {
  try {
    ensureDirs();
    const files = fs.readdirSync(archiveDir);
    const now = Date.now();
    const cutoff = now - RETENTION_DAYS * 24 * 60 * 60 * 1000;

    let deleted = 0;
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const [date] = file.split(".");
      const fileDate = new Date(date).getTime();
      if (!isNaN(fileDate) && fileDate < cutoff) {
        fs.unlinkSync(path.join(archiveDir, file));
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`🧹 Cleaned up ${deleted} old archive(s) older than ${RETENTION_DAYS} days.`);
    }
  } catch (err) {
    console.warn("⚠️ Failed to clean old archives:", err);
  }
}

export async function GET() {
  try {
    ensureDirs();
    const logs = JSON.parse(fs.readFileSync(logFile, "utf8"));
    return NextResponse.json(logs.reverse());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    ensureDirs();

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const auth = req.headers.get("authorization");
    const key =
      auth && auth.startsWith("Bearer ") ? auth.replace("Bearer ", "") : "";
    const keyHash = key ? hashKey(key) : "no-key";

    const body = await req.json();
    if (!body || typeof body !== "object") throw new Error("Invalid JSON body");

    const logs = JSON.parse(fs.readFileSync(logFile, "utf8"));

    const entry = {
      id: Date.now(),
      time: new Date().toISOString(),
      ip,
      keyHash,
      route: "/api/generate/selfrepair",
      ...body,
    };

    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);

    // 🗄️ Archive + cleanup
    createDailyBackup();
    cleanupOldArchives();

    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), "utf8");

    updateLastAlert(entry);

    return NextResponse.json({ success: true, entry, total: logs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function updateLastAlert(entry: any) {
  try {
    const alertFile = path.join(logDir, "lastAlert.json");
    const data = {
      level: entry.level || "info",
      message: entry.overall || "No summary provided",
      time: new Date().toISOString(),
      provider: process.env.ALERTS_PROVIDER || "resend",
    };
    fs.writeFileSync(alertFile, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.warn("⚠️ Failed to update lastAlert.json:", err);
  }
}
