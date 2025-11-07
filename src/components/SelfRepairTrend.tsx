"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type TrendEntry = {
  date: string;
  errors: number;
  warns: number;
  infos: number;
  successRate?: number;
};

export default function SelfRepairTrend() {
  const [trend, setTrend] = useState<TrendEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/generate/selfrepair/cron/daily", {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_ACCESS_KEY}`,
          },
        });
        const data = await res.json();
        if (data.trend) setTrend(data.trend);
      } catch (e) {
        console.error("Error loading trend:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Loading 7-day trend…</p>;
  if (!trend.length) return <p>No data yet.</p>;

  const latest = trend.at(-1);
  const avgSuccess =
    trend.reduce((a, b) => a + (b.successRate ?? 0), 0) / trend.length;

  return (
    <div className="bg-white dark:bg-zinc-900 shadow-md rounded-2xl p-4 w-full">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        📊 7-Day Self-Repair Health Trend
      </h3>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <span className="text-red-600">❌ Errors: {latest?.errors ?? 0}</span>
        <span className="text-yellow-600">⚠️ Warnings: {latest?.warns ?? 0}</span>
        <span className="text-green-600">✅ OK: {latest?.infos ?? 0}</span>
        <span className="text-sky-600">
          💪 Success Rate: {latest?.successRate ?? 0}% (avg {avgSuccess.toFixed(1)}%)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={trend}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" allowDecimals={false} />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            label={{
              value: "Success %",
              angle: -90,
              position: "insideRight",
              style: { fill: "#38bdf8", fontSize: 12 },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(0,0,0,0.7)",
              color: "#fff",
              borderRadius: "0.5rem",
            }}
          />
          <Legend />

          {/* Core metrics */}
          <Line yAxisId="left" type="monotone" dataKey="errors" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
          <Line yAxisId="left" type="monotone" dataKey="warns" stroke="#facc15" strokeWidth={2} dot={{ r: 3 }} />
          <Line yAxisId="left" type="monotone" dataKey="infos" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />

          {/* Success Rate line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="successRate"
            stroke="#38bdf8"
            strokeWidth={3}
            strokeDasharray="4 2"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}