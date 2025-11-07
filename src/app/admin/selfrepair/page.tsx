"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wrench, Lock } from "lucide-react";
import DailySummaryButton from "@/components/DailySummaryButton";
import SelfRepairTrend from "@/components/SelfRepairTrend";
import WeeklyRollupCard from "@/components/WeeklyRollupCard";

interface SelfRepairReport {
  timestamp: string;
  mode: string;
  overall: string;
  checks: {
    codebase?: any;
    environment?: any;
    sdk?: any;
  };
}

export default function SelfRepairDashboard() {
  const [data, setData] = useState<SelfRepairReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  // --- Load saved key on mount ---
  useEffect(() => {
    const storedKey = localStorage.getItem("adminKey");
    if (storedKey) {
      setAuthorized(true);
      fetchReport(false, storedKey);
    }
  }, []);

  // --- Core fetcher ---
  const fetchReport = async (repair = false, key?: string) => {
    const token = key || localStorage.getItem("adminKey");
    if (!token) {
      setError("No admin key found");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/generate/selfrepair${repair ? "?repair=true" : ""}`,
        {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.status === 401) throw new Error("Unauthorized — invalid admin key");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Handle login ---
  const handleLogin = () => {
    if (!keyInput.trim()) {
      setError("Please enter your admin key.");
      return;
    }
    localStorage.setItem("adminKey", keyInput.trim());
    setAuthorized(true);
    fetchReport(false, keyInput.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem("adminKey");
    setAuthorized(false);
    setData(null);
  };

  const statusColor = (msg: string) => {
    if (msg.includes("✅")) return "text-green-600";
    if (msg.includes("⚠️")) return "text-yellow-600";
    if (msg.includes("❌")) return "text-red-600";
    return "text-gray-600";
  };

  const SectionCard = ({
    title,
    body,
  }: {
    title: string;
    body: React.ReactNode;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="shadow-sm border rounded-2xl mb-4">
        <CardContent className="p-5 space-y-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          {body}
        </CardContent>
      </Card>
    </motion.div>
  );

  // === LOGIN SCREEN ===
  if (!authorized) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }}
        >
          <Card className="p-6 w-96 text-center space-y-4">
            <Lock className="h-8 w-8 mx-auto text-gray-500" />
            <h1 className="text-2xl font-bold">Admin Login</h1>
            <p className="text-gray-600 text-sm">
              Enter your <code>ADMIN_ACCESS_KEY</code> to access the dashboard.
            </p>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter Admin Key"
              className="w-full border rounded-lg p-2 text-center outline-none focus:ring focus:ring-blue-300"
            />
            <Button onClick={handleLogin} className="w-full">
              Unlock Dashboard
            </Button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </Card>
        </motion.div>
      </main>
    );
  }

{/* === Event Log Panel === */}
<SectionCard
  title="📜 Event Log"
  body={
    <LogPanel />
  }
/>

  // === DASHBOARD ===
  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">🧠 Gemini Self-Repair Dashboard</h1>
        <p className="text-xs text-gray-500">
          🔄 Hourly watchdog active — auto-checks for session errors.
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => fetchReport()}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button
            onClick={() => fetchReport(true)}
            disabled={loading}
            variant="default"
          >
            <Wrench className="h-4 w-4 mr-2" /> Auto-Repair
          </Button>
          <Button
            onClick={handleLogout}
            variant="destructive"
            disabled={loading}
          >
            Logout
          </Button>
          <Button
            onClick={async () => {
              try {
                const res = await fetch("/api/generate/selfrepair/alert-test", {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("adminKey")}`,
                  },
                });
                const data = await res.json();
                if (data.success) {
                  alert(`✅ Test alert sent via ${data.provider} to ${data.sentTo}`);
                } else {
                  alert(`⚠️ Failed: ${data.error || "Unknown error"}`);
                }
              } catch (err) {
                alert("⚠️ Error sending test alert: " + (err as Error).message);
              }
            }}
            variant="outline"
          >
            Send Test Alert
          </Button>
          <DailySummaryButton />
          <Button
            onClick={async () => {
              try {
                const res = await fetch("/api/generate/selfrepair/summary?sendEmail=true", {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("adminKey")}`,
                  },
                });
                const data = await res.json();
                if (data.summary) {
                  alert("✅ AI summary emailed successfully!");
                } else {
                  alert("⚠️ Failed: " + (data.error || "Unknown error"));
                }
              } catch (err) {
                alert("⚠️ Error: " + (err as Error).message);
              }
            }}
            variant="outline"
          >
            🤖 Generate AI Health Summary
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <SelfRepairTrend />
        <WeeklyRollupCard />
      </div>

      {loading && (
        <div className="text-center text-gray-500 animate-pulse">
          Checking system health...
        </div>
      )}

      {error && <div className="text-red-600">Error: {error}</div>}

      {data && (
        <>
          <LastAlertPanel />

          <SectionCard
            title="🧾 Overview"
            body={
              <div className="space-y-1">
                <p>
                  <b>Timestamp:</b> {data.timestamp}
                </p>
                <p>
                  <b>Mode:</b> {data.mode}
                </p>
                <p className={`font-semibold ${statusColor(data.overall)}`}>
                  {data.overall}
                </p>
              </div>
            }
          />

          <SectionCard
            title="🧩 Codebase Check"
            body={
              <div className="space-y-2">
                <p
                  className={statusColor(
                    data.checks.codebase?.message || "⚠️ No data"
                  )}
                >
                  {data.checks.codebase?.message}
                </p>
                {data.checks.codebase?.deprecatedReferences > 0 && (
                  <details className="bg-gray-50 p-2 rounded text-sm">
                    <summary className="cursor-pointer">
                      Show Deprecated References
                    </summary>
                    <ul className="pl-5 list-disc">
                      {data.checks.codebase.matches.map(
                        (m: any, idx: number) => (
                          <li key={idx}>
                            {m.file}:{m.line} —{" "}
                            <code className="text-gray-700">{m.snippet}</code>
                          </li>
                        )
                      )}
                    </ul>
                  </details>
                )}
              </div>
            }
          />

          <SectionCard
            title="🔑 Environment Check"
            body={
              <div className="space-y-1">
                <p>
                  <b>.env.local:</b> {data.checks.environment?.file}
                </p>
                <p className={statusColor(data.checks.environment?.message)}>
                  {data.checks.environment?.message}
                </p>
                {data.checks.environment?.fixes?.length > 0 && (
                  <ul className="pl-5 list-disc text-sm text-gray-600">
                    {data.checks.environment.fixes.map(
                      (f: string, i: number) => (
                        <li key={i}>{f}</li>
                      )
                    )}
                  </ul>
                )}
              </div>
            }
          />

          <SectionCard
            title="⚙️ SDK Health"
            body={
              <div className="space-y-1">
                <p>
                  <b>SDK Version:</b>{" "}
                  {data.checks.sdk?.version || "Unknown"}
                </p>
                <p className={statusColor(data.checks.sdk?.message)}>
                  {data.checks.sdk?.message}
                </p>
                <p>
                  <b>Response Preview:</b>{" "}
                  <code>{data.checks.sdk?.response}</code>
                </p>
              </div>
            }
          />
        </>
      )}
    </main>
  );
}

function TestAlertButton() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);

  // Detect alert system configuration
  useEffect(() => {
    const detectAlerts = async () => {
      try {
        const res = await fetch("/api/generate/selfrepair/config");
        const data = await res.json();
        if (data.alerts?.enabled) {
          setEnabled(true);
          setProvider(data.alerts.provider);
        } else {
          setEnabled(false);
        }
      } catch {
        setEnabled(false);
      }
    };
    detectAlerts();
  }, []);

  const sendTest = async () => {
    if (!enabled) return; // Prevent action if not enabled
    setLoading(true);
    try {
      const res = await fetch("/api/generate/selfrepair/alert-test", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminKey")}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Test alert sent via ${data.provider} to ${data.sentTo}`);
      } else {
        alert(`⚠️ Failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert("⚠️ Error sending test alert: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!enabled)
    return (
      <Button variant="ghost" disabled className="opacity-60 cursor-not-allowed">
        Alerts not configured
      </Button>
    );

  return (
    <Button onClick={sendTest} disabled={loading} className="flex items-center gap-2">
      {loading ? "Sending..." : `Send Test Alert (${provider})`}
    </Button>
  );
}

function LastAlertPanel() {
  const [alert, setAlert] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState(false);
  const lastIdRef = useRef<string | null>(null);

  const fetchAlert = async () => {
    try {
      const res = await fetch("/api/generate/selfrepair/alerts/last", {
        cache: "no-store",
      });
      const data = await res.json();

      // Detect if this is a NEW alert (time changed)
      if (alert && data.time !== alert.time) {
        // Only animate if it's a warn or error
        if (["warn", "error"].includes(data.level)) {
          setAnimating(true);
          setTimeout(() => setAnimating(false), 3000); // animate for 3s
        }
      }

      setAlert(data);
    } catch {
      setAlert(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlert();
    const interval = setInterval(fetchAlert, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return <div className="text-gray-500 text-sm">Checking last alert...</div>;

  if (!alert || alert.message === "No alerts sent yet.")
    return (
      <div className="text-gray-400 text-sm border p-3 rounded-lg bg-gray-50">
        No alerts sent yet.
      </div>
    );

  const color =
    alert.level === "error"
      ? "border-red-300 bg-red-50"
      : alert.level === "warn"
      ? "border-yellow-300 bg-yellow-50"
      : "border-green-300 bg-green-50";

  const pulseColor =
    alert.level === "error"
      ? "rgba(220, 38, 38, 0.2)"
      : alert.level === "warn"
      ? "rgba(234, 179, 8, 0.2)"
      : "rgba(34, 197, 94, 0.2)";

  return (
    <AnimatePresence>
      <motion.div
        key={alert.time}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className={`p-3 border rounded-lg shadow-sm transition-all ${color}`}
          animate={
            animating
              ? {
                  boxShadow: [
                    `0 0 0 0 ${pulseColor}`,
                    `0 0 0 15px rgba(0,0,0,0)`,
                  ],
                }
              : {}
          }
          transition={
            animating
              ? { duration: 1.2, repeat: 2, ease: "easeInOut" }
              : { duration: 0 }
          }
        >
          <div className="flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              📬 Last Alert Sent
            </h3>
            <span
              className={`text-sm font-medium ${
                alert.level === "error"
                  ? "text-red-600"
                  : alert.level === "warn"
                  ? "text-yellow-600"
                  : "text-green-600"
              }`}
            >
              {alert.level.toUpperCase()}
            </span>
          </div>
          <p className="text-gray-800 mt-1 text-sm">{alert.message}</p>
          <p className="text-gray-500 text-xs mt-1">
            Sent {new Date(alert.time).toLocaleString()} via {alert.provider}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}