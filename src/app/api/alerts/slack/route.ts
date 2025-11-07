import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, level, details } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!slackWebhookUrl) {
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 });
    }

    const payload = {
      text: `[${level || "info"}] AI Brand Hub Alert: ${message}`,
      attachments: [
        {
          color: level === "error" ? "#FF0000" : level === "warn" ? "#FFA500" : "#36A64F",
          fields: Object.entries(details || {}).map(([key, value]) => ({
            title: key,
            value: JSON.stringify(value),
            short: false,
          })),
          ts: Math.floor(new Date().getTime() / 1000).toString(),
        },
      ],
    };

    const res = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to send Slack alert: ${res.status} - ${errorText}`);
    }

    return NextResponse.json({ success: true, message: "Slack alert sent" });
  } catch (error: any) {
    console.error("Error sending Slack alert:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send Slack alert." },
      { status: 500 }
    );
  }
}