"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function DailySummaryButton() {
  const [loading, setLoading] = useState(false);

  const sendNow = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generate/selfrepair/cron/daily", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_ACCESS_KEY}`,
        },
      });
      const data = await res.json();
      if (data.sent) {
        alert("✅ Daily summary email sent successfully!");
      } else if (data.status === "ok") {
        alert("✅ Daily summary triggered and completed locally.");
      } else {
        alert("⚠️ Failed to send: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      alert("⚠️ Error sending summary: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={sendNow} disabled={loading}>
      {loading ? "Sending..." : "📅 Send Daily Summary Now"}
    </Button>
  );
}
