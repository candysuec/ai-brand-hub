import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, level, details } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!discordWebhookUrl) {
      return NextResponse.json({ error: "Discord webhook URL not configured" }, { status: 500 });
    }

    const color = level === "error" ? 15548997 : level === "warn" ? 16776960 : 3066993; // Red, Yellow, Green

    const fields = Object.entries(details || {}).map(([key, value]) => ({
      name: key,
      value: `\
${JSON.stringify(value, null, 2)}
`,
      inline: false,
    }));

    const payload = {
      embeds: [
        {
          title: `AI Brand Hub Alert: ${message}`,
          description: `**Level:** ${level || "info"}`,
          color: color,
          timestamp: new Date().toISOString(),
          fields: fields,
        },
      ],
    };

    const res = await fetch(discordWebhookUrl, {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to send Discord alert: ${res.status} - ${errorText}`);
    }

    return NextResponse.json({ success: true, message: "Discord alert sent" });
  } catch (error: any) {
    console.error("Error sending Discord alert:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send Discord alert." },
      { status: 500 }
    );
  }
}