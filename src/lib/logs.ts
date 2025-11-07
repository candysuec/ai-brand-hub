import fs from "fs";
import path from "path";

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

export function archiveLogs() {
  try {
    ensureLogFiles();
    const today = todayIsoDateUTC();
    const archivePath = path.join(ARCHIVE_DIR, `selfrepair-log-${today}.json`);
    if (!fs.existsSync(archivePath)) {
      // Snapshot current active log BEFORE pruning
      const logs = readActiveLogs();
      fs.writeFileSync(archivePath, JSON.stringify(logs, null, 2), "utf8");
      console.log(`🗄️ Archived daily snapshot: ${archivePath}`);
    }
  } catch (err) {
    console.warn("⚠️ Failed to create daily backup:", err);
  }
}

export function pruneLogs() {
  try {
    ensureLogFiles();
    const logs = readActiveLogs();
    if (logs.length > MAX_ACTIVE) {
      const trimmed = logs.slice(-MAX_ACTIVE);
      fs.writeFileSync(ACTIVE_LOG, JSON.stringify(trimmed, null, 2), "utf8");
      console.log(`[Unified Cron] 🧹 Pruned ${logs.length - MAX_ACTIVE} old active log entries`);
    }

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
