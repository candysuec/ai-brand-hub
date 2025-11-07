import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

/**
 * Unified Cron Job (Hobby plan optimized)
 * ---------------------------------------
 * ✅ Runs every hour
 * ✅ Performs hourly self-repair
 * ✅ Runs daily summary once/day (00:00 UTC)
 * ✅ Daily backup of logs BEFORE pruning
 * ✅ Auto-prunes active log to last 1000 entries
 * ✅ Auto-cleans archive older than 30 days
 */

const LOG_DIR = path.join(process.cwd(), "logs");
const ACTIVE_LOG = path.join(LOG_DIR, "selfrepair-log.json");
const ARCHIVE_DIR = path.join(LOG_DIR, "archive");
const MAX_ACTIVE = 1000;
const ARCHIVE_RETENTION_DAYS = parseInt(process.env.SELFREPAIR_RETENTION_DAYS || "30", 10);

function ensureLogFiles() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  if (!fs.existsSync(ACTIVE_LOG)) fs.writeFileSync(ACTIVE_LOG, "[]", "utf8");
}

function readActiveLogs(): any[] {
  try {
    const raw = fs.readFileSync(ACTIVE_LOG, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function todayIsoDateUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function archiveTodayIfMissing() {
  const today = todayIsoDateUTC();
  const archivePath = path.join(ARCHIVE_DIR, `selfrepair-log-${today}.json`);
  if (!fs.existsSync(archivePath)) {
    // Snapshot current active log BEFORE pruning
    const logs = readActiveLogs();
    fs.writeFileSync(archivePath, JSON.stringify(logs, null, 2), "utf8");
    console.log(`🗄️ Archived daily snapshot: ${archivePath}`);
  }
}

function pruneActiveLog() {
  const logs = readActiveLogs();
  if (logs.length > MAX_ACTIVE) {
    const trimmed = logs.slice(-MAX_ACTIVE);
    fs.writeFileSync(ACTIVE_LOG, JSON.stringify(trimmed, null, 2), "utf8");
    console.log(`[Unified Cron] 🧹 Pruned ${logs.length - MAX_ACTIVE} old active log entries`);
  }
}

function cleanupOldArchives() {
  try {
    const files = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith(".json"));
    const now = Date.now();
    const cutoff = now - ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    let deleted = 0;
    for (const f of files) {
      // Expect filename: selfrepair-log-YYYY-MM-DD.json
      const m = f.match(/selfrepair-log-(\d{4}-\d{2}-\d{2})\.json$/);
      if (!m) continue;
      const t = new Date(m[1]).getTime();
      if (!isNaN(t) && t < cutoff) {
        fs.unlinkSync(path.join(ARCHIVE_DIR, f));
        deleted++;
      }
    }
    if (deleted > 0) {
      console.log(`🧹 Cleaned ${deleted} archive snapshot(s) older than ${ARCHIVE_RETENTION_DAYS} days`);
    }
  } catch (e) {
    console.warn("⚠️ Failed to clean old archives:", (e as Error).message);
  }
}

export async function GET() {
  const now = new Date();
  const hour = now.getUTCHours();
  const timestamp = now.toISOString();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const adminKey = process.env.ADMIN_ACCESS_KEY || "";

  try {
    ensureLogFiles();

    // 1️⃣ Always run the self-repair check
    const hourly = await fetch(`${baseUrl}/api/generate/selfrepair`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    const hourlyResult = await hourly.json();

    // 2️⃣ Run daily summary once a day (00:00 UTC)
    let dailyResult: any = null;
    let ranDaily = false;

    if (hour === 0) {
      ranDaily = true;

      // 2a) Daily archive snapshot BEFORE pruning
      archiveTodayIfMissing();

      // 2b) Trigger daily summary & email
      const daily = await fetch(`${baseUrl}/api/generate/selfrepair/cron/daily`, {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      dailyResult = await daily.json();

      // 2c) Prune active log & clean old archives
      pruneActiveLog();
      cleanupOldArchives();
    }

    console.log(`[Unified Cron] ${timestamp} ✅ Hourly OK | Daily: ${ranDaily ? "Ran" : "Skipped"}`);

    return NextResponse.json({
      ok: true,
      timestamp,
      hour,
      ranDaily,
      hourly: hourlyResult,
      daily: dailyResult,
    });
  } catch (err: any) {
    console.error("[Unified Cron Error]", err);
    return NextResponse.json({ ok: false, error: err.message, timestamp }, { status: 500 });
  }
}
