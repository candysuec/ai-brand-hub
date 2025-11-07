"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/shared/DashboardLayout"; // Added import

interface DiagnosticResult {
  [key: string]: string;
}

export default function DiagnosticsPage() {
  const [results, setResults] = useState<DiagnosticResult | null>({
    gemini: "✅ OK",
    database: "❌ Failed: Invalid API Key",
    mailer: "⚠️ Not Configured",
    logs: "✅ OK",
    cron: "⚠️ Manual verification needed",
  });
  const [loading, setLoading] = useState(false); // Set to false since we have mock data
  const [error, setError] = useState<string | null>(null);

  // Comment out fetchDiagnostics and useEffect to prevent API call while using mock data
  // const fetchDiagnostics = async () => {
  //   setLoading(true);
  //   setError(null);
  //   try {
  //     const res = await fetch("/api/system-check");
  //     if (!res.ok) {
  //       throw new Error(`HTTP error! status: ${res.status}`);
  //     }
  //     const data: DiagnosticResult = await res.json();
  //     setResults(data);
  //   } catch (err: any) {
  //     setError(err.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // useEffect(() => {
  //   fetchDiagnostics();
  // }, []);

  const getIcon = (status: string) => {
    if (status.includes("✅")) return <CheckCircle className="text-green-500" />;
    if (status.includes("❌")) return <XCircle className="text-red-500" />;
    if (status.includes("⚠️")) return <AlertTriangle className="text-yellow-500" />;
    return null;
  };

  const getStatusColor = (status: string) => {
    if (status.includes("✅")) return "text-green-600";
    if (status.includes("❌")) return "text-red-600";
    if (status.includes("⚠️")) return "text-yellow-600";
    return "text-gray-600";
  };

  return (
    <DashboardLayout> {/* Wrapped with DashboardLayout */}
      <div className="p-6 max-w-4xl mx-auto space-y-6"> {/* Removed main tag classes to be applied directly to this div */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">System Diagnostics</h1>
          <Button onClick={fetchDiagnostics} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" /> {loading ? "Refreshing..." : "Run All Checks"}
          </Button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </motion.div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence>
            {results &&
              Object.entries(results).map(([key, value]) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()} Check
                      </CardTitle>
                      {getIcon(value)}
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getStatusColor(value)}`}>
                        {value}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout> {/* Closed DashboardLayout */}
  );
}
