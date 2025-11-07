export type AlertLevel = "info" | "warn" | "error";

type SendParams = {
  subject: string;
  html: string;
  text?: string;
};

function getEnv(name: string, fallback?: string) {
  const v = process.env[name];
  if (!v && !fallback) throw new Error(`Missing env: ${name}`);
  return v ?? fallback!;
}

async function sendViaResend(params: SendParams) {
  const apiKey = getEnv("RESEND_API_KEY");
  const from = getEnv("ALERTS_FROM");
  const to = getEnv("ALERTS_TO");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: to.split(",").map(s => s.trim()),
      subject: params.subject,
      html: params.html,
      text: params.text ?? params.html.replace(/<[^>]+>/g, ""),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend error: ${res.status} ${body}`);
  }
}

async function sendViaSendgrid(params: SendParams) {
  const apiKey = getEnv("SENDGRID_API_KEY");
  const from = getEnv("ALERTS_FROM");
  const to = getEnv("ALERTS_TO");

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: to.split(",").map(s => ({ email: s.trim() })) }],
      from: { email: from.replace(/.*<(.+)>.*$/, "$1") }, // extract email if "Name <email>"
      subject: params.subject,
      content: [
        { type: "text/plain", value: params.text ?? params.html.replace(/<[^>]+>/g, "") },
        { type: "text/html", value: params.html },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SendGrid error: ${res.status} ${body}`);
  }
}

export async function sendAlert(level: AlertLevel, title: string, details: Record<string, any> = {}) {
  const configuredProvider = (process.env.ALERTS_PROVIDER || "resend").toLowerCase();
  const minLevel = (process.env.ALERTS_MIN_LEVEL || "warn").toLowerCase() as AlertLevel;

  const order: AlertLevel[] = ["info", "warn", "error"];
  if (order.indexOf(level) < order.indexOf(minLevel)) {
    return; // below threshold, ignore
  }

  const appBase = process.env.APP_BASE_URL || "http://localhost:3000";
  const subject = `[${level.toUpperCase()}] Self-Repair: ${title}`;
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <h2>${subject}</h2>
      <p><b>Timestamp:</b> ${new Date().toISOString()}</p>
      <p><b>Dashboard:</b> <a href="${appBase}/admin/selfrepair">${appBase}/admin/selfrepair</a></p>
      <pre style="white-space:pre-wrap;background:#f6f8fa;border-radius:6px;padding:12px;border:1px solid #eee;">${escapeHtml(JSON.stringify(details, null, 2))}</pre>
    </div>
  `;

  const params: SendParams = { subject, html };

  if (configuredProvider === "sendgrid") {
    await sendViaSendgrid(params);
  } else {
    await sendViaResend(params);
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
