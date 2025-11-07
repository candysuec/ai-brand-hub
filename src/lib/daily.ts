import { sendAlert } from "@/lib/alerts/mailer";
import fs from "fs";
import path from "path";

// Assuming LogEntry type is defined elsewhere or can be duplicated here
type LogEntry = {
  id: number;
  time: string;
  overall?: string;
  sdk?: string;
  env?: string;
  code?: string;
  mode?: string;
  ip?: string;
  keyHash?: string;
};

function loadLogs(): LogEntry[] {
  const logPath = path.join(process.cwd(), "logs", "selfrepair-log.json");
  if (!fs.existsSync(logPath)) return [];
  try {
    const arr = JSON.parse(fs.readFileSync(logPath, "utf8"));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function withinLast24h(iso: string) {
  const now = Date.now();
  const t = Date.parse(iso);
  return !Number.isNaN(t) && now - t <= 24 * 60 * 60 * 1000;
}

function countContains(items: string[], emoji: string) {
  return items.filter(Boolean).filter((s) => s.includes(emoji)).length;
}

function safe(s?: string) {
  return s || "";
}

// Create a small SVG sparkline for trend visualization
function buildSparkline(data: number[], color: string, height = 40, width = 140) {
  if (data.length === 0) return "";
  const max = Math.max(...data);
  const min = Math.min(...data);
  const step = width / (data.length - 1);
  const points = data
    .map((v, i) => {
      const y = height - ((v - min) / (max - min || 1)) * height;
      const x = i * step;
      return `${x},${y}`;
    })
    .join(" ");
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <polyline fill="none" stroke="${color}" stroke-width="2" points="${points}" />
  </svg>`;
}

function summarize(entries: LogEntry[]) {
  const overalls = entries.map((e) => e.overall || "");
  const total = entries.length;
  const errors = countContains(overalls, "❌");
  const warns = countContains(overalls, "⚠️");
  const infos = countContains(overalls, "✅");
  const successRate = total ? Math.round((infos / total) * 100) : 0;
  return { total, errors, warns, infos, successRate };
}

export async function sendDailySummary() {
  const logs = loadLogs();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Group by day (last 7 days)
  const dailyStats: { date: string; errors: number; warns: number; infos: number; successRate: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const start = now - i * dayMs;
    const dayStr = new Date(start).toISOString().slice(0, 10);
    const dayLogs = logs.filter((e) => {
      const t = Date.parse(e.time || "");
      return t >= start - dayMs / 2 && t < start + dayMs / 2;
    });

    const overalls = dayLogs.map((e) => safe(e.overall));
    const errors = countContains(overalls, "❌");
    const warns = countContains(overalls, "⚠️");
    const infos = countContains(overalls, "✅");
    const total = errors + warns + infos;
    const successRate = total ? Math.round((infos / total) * 100) : 0;

    dailyStats.push({ date: dayStr, errors, warns, infos, successRate });
  }

  // Totals (last 24h)
  const last24 = logs.filter((e) => Date.now() - Date.parse(e.time || "") <= dayMs);
  const overalls = last24.map((e) => safe(e.overall));
  const total = last24.length;
  const errors = countContains(overalls, "❌");
  const warns = countContains(overalls, "⚠️");
  const infos = countContains(overalls, "✅");

  // Build sparklines
  const errorSpark = buildSparkline(dailyStats.map((d) => d.errors), "#dc2626");
  const warnSpark = buildSparkline(dailyStats.map((d) => d.warns), "#facc15");
  const okSpark = buildSparkline(dailyStats.map((d) => d.infos), "#16a34a");

  const severity = errors > 0 ? "error" : warns > 0 ? "warn" : "info";
  const subjectBase = `Daily Self-Repair Summary (${new Date().toISOString().slice(0, 10)})`;

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <h2>${subjectBase}</h2>
      <p><b>Window:</b> Last 24 hours</p>
      <table cellspacing="0" cellpadding="6" style="border-collapse:collapse">
        <tr><td>🧮 Total Runs</td><td><b>${total}</b></td></tr>
        <tr><td>❌ Errors</td><td><b>${errors}</b></td></tr>
        <tr><td>⚠️ Warnings</td><td><b>${warns}</b></td></tr>
        <tr><td>✅ Info/OK</td><td><b>${infos}</b></td></tr>
      </table>

      <h3 style="margin-top:16px">📊 7-Day Trend</h3>
      <div style="display:flex;gap:16px;align-items:center;">
        <div><b>Errors</b><br/>${errorSpark}</div>
        <div><b>Warnings</b><br/>${warnSpark}</div>
        <div><b>OK</b><br/>${okSpark}</div>
      </div>

      <h3 style="margin-top:16px">Recommendations</h3>
      <ul>
        ${
          errors > 0
            ? "<li>❌ Investigate failing SDK or environment checks.</li>"
            : warns > 0
            ? "<li>⚠️ Review warnings — run Auto-Repair soon.</li>"
            : "<li>✅ All systems healthy.</li>"
        }
      </ul>

      <p style="margin-top:16px">
        View dashboard:
        <a href="${process.env.APP_BASE_URL || "http://localhost:3000"}/admin/selfrepair">
          ${process.env.APP_BASE_URL || "http://localhost:3000"}/admin/selfrepair
        </a>
      </p>
    </div>
  `;

  await sendAlert(severity as any, subjectBase, {
    html,
    window: "last 24h",
    totals: { runs: total, errors, warns, infos },
    trend: dailyStats,
  });

  return { status: "ok", sent: true, totals: { runs: total, errors, warns, infos }, trend: dailyStats };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
