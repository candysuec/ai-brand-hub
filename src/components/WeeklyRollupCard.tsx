"use client";

import React, { useEffect, useState } from "react";

type WeeklySummary = {
  total: number;
  errors: number;
  warns: number;
  infos: number;
  successRate: number;
};

type Confidence = {
  thisWeek: number;
  lastWeek: number;
  change: number;
};

type ApiResponse = {
  thisWeek: WeeklySummary;
  lastWeek: WeeklySummary;
  change: {
    errors: number;
    warns: number;
    infos: number;
    successRate: number;
  };
  confidence: Confidence;
};

export default function WeeklyRollupCard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/generate/selfrepair/cron/daily", {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_ACCESS_KEY}`,
          },
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error loading weekly roll-up:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Loading weekly roll-up…</p>;
  if (!data) return <p>No data available.</p>;

  const { thisWeek, change, confidence } = data;

  const color = (v: number, invert = false) => {
    if (v === 0) return "text-gray-400";
    if (invert) return v > 0 ? "text-red-500" : "text-green-500";
    return v > 0 ? "text-green-500" : "text-red-500";
  };

  const arrow = (v: number, invert = false) => {
    if (v === 0) return "→";
    if (invert) return v > 0 ? "↑" : "↓";
    return v > 0 ? "↑" : "↓";
  };

  const confidenceColor =
    confidence.thisWeek >= 90
      ? "text-green-500"
      : confidence.thisWeek >= 75
      ? "text-yellow-500"
      : "text-red-500";

  return (
    <div className="bg-white dark:bg-zinc-900 shadow-md rounded-2xl p-4 w-full mt-6">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        📅 Weekly Self-Repair Roll-Up
      </h3>
      <p className="text-sm text-gray-500 mb-3">
        Comparing last 7 days vs previous 7-day window
      </p>

      <div className="mb-4 p-3 rounded-md bg-zinc-50 dark:bg-zinc-800 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase">System Confidence</p>
          <p className={`text-3xl font-bold ${confidenceColor}`}>
            {confidence.thisWeek.toFixed(0)}%
            <span
              className={`ml-2 ${
                confidence.change >= 0 ? "text-green-500" : "text-red-500"
              } text-sm`}
            >
              {confidence.change >= 0 ? "▲" : "▼"} {Math.abs(confidence.change).toFixed(1)}%
            </span>
          </p>
        </div>
        <div className="w-1/3 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500"
            style={{ width: `${confidence.thisWeek}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-2 rounded-md bg-zinc-50 dark:bg-zinc-800">
          <p className="text-xs text-gray-400">✅ Success Rate</p>
          <p className="text-xl font-bold text-sky-600">
            {thisWeek.successRate}%
            <span className={`ml-2 ${color(change.successRate)}`}>
              {arrow(change.successRate)} {Math.abs(change.successRate)}%
            </span>
          </p>
        </div>
        <div className="p-2 rounded-md bg-zinc-50 dark:bg-zinc-800">
          <p className="text-xs text-gray-400">❌ Errors</p>
          <p className="text-xl font-bold text-red-600">
            {thisWeek.errors}
            <span className={`ml-2 ${color(change.errors, true)}`}>
              {arrow(change.errors, true)} {Math.abs(change.errors)}
            </span>
          </p>
        </div>
        <div className="p-2 rounded-md bg-zinc-50 dark:bg-zinc-800">
          <p className="text-xs text-gray-400">⚠️ Warnings</p>
          <p className="text-xl font-bold text-yellow-600">
            {thisWeek.warns}
            <span className={`ml-2 ${color(change.warns, true)}`}>
              {arrow(change.warns, true)} {Math.abs(change.warns)}
            </span>
          </p>
        </div>
        <div className="p-2 rounded-md bg-zinc-50 dark:bg-zinc-800">
          <p className="text-xs text-gray-400">✅ OK</p>
          <p className="text-xl font-bold text-green-600">
            {thisWeek.infos}
            <span className={`ml-2 ${color(change.infos)}`}>
              {arrow(change.infos)} {Math.abs(change.infos)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}