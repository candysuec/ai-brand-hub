// src/components/LogPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area"; // Assuming you have a scroll area component

interface LogEntry {
  id: number;
  time: string;
  overall?: string;
  sdk?: string;
  env?: string;
  code?: string;
  mode?: string;
  ip?: string;
  keyHash?: string;
  // Add other fields as per your log structure
}

export default function LogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate/selfrepair/logs", {
        cache: "no-store", // Always fetch latest logs
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Optionally, refresh logs periodically
    const interval = setInterval(fetchLogs, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-gray-500">Loading logs...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading logs: {error}</div>;
  }

  if (logs.length === 0) {
    return <div className="text-gray-500">No logs available.</div>;
  }

  return (
    <Card className="shadow-sm border rounded-2xl">
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
          {logs.map((log, index) => (
            <div key={log.id || index} className="mb-2 pb-2 border-b last:border-b-0 text-sm">
              <p className="font-medium text-gray-700">{log.time} - {log.overall}</p>
              {log.sdk && <p className="text-gray-600 ml-2">SDK: {log.sdk}</p>}
              {log.env && <p className="text-gray-600 ml-2">Env: {log.env}</p>}
              {log.code && <p className="text-gray-600 ml-2">Code: {log.code}</p>}
              {/* Add more log details as needed */}
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
