"use client";

import { useState } from "react";

interface ReportEntry {
  key: string;
  lastModified: string;
}

interface ReportData {
  generated_at?: string;
  owner?: string;
  repo?: string;
  job_type?: string;
  [key: string]: unknown;
}

function ReportContent({ data }: { data: ReportData }) {
  const { generated_at, owner, repo, job_type, ...rest } = data;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-3 text-xs">
        {job_type && (
          <span className="bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-md">
            {job_type}
          </span>
        )}
        {generated_at && (
          <span className="text-slate-500">
            {new Date(generated_at).toLocaleString("ja-JP")}
          </span>
        )}
      </div>

      {Object.entries(rest).map(([key, value]) => (
        <div key={key} className="border-t border-slate-700/30 pt-2">
          <h5 className="text-xs font-medium text-slate-400 mb-1">
            {key.replace(/_/g, " ")}
          </h5>
          <div className="text-sm text-slate-300">
            {typeof value === "string" ? (
              <p className="whitespace-pre-wrap">{value}</p>
            ) : (
              <pre className="text-xs bg-slate-900/50 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(value, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportList({ reports }: { reports: ReportEntry[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, ReportData>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(key: string) {
    if (expanded === key) {
      setExpanded(null);
      return;
    }

    setExpanded(key);
    setError(null);

    if (cache[key]) return;

    setLoading(key);
    try {
      const res = await fetch(
        `/api/reports?key=${encodeURIComponent(key)}`
      );
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      setCache((prev) => ({ ...prev, [key]: data }));
    } catch {
      setError("Failed to load report");
    } finally {
      setLoading(null);
    }
  }

  if (reports.length === 0) {
    return <p className="text-slate-500 text-sm">No reports yet.</p>;
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => {
        const isExpanded = expanded === report.key;
        const label = report.key.split("/").slice(-3).join("/");
        const jobType = report.key.split("/").slice(-3, -2)[0];

        return (
          <div key={report.key}>
            <button
              onClick={() => handleClick(report.key)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                isExpanded
                  ? "bg-slate-800 border-indigo-500/50"
                  : "bg-slate-800/50 border-slate-700/50 hover:border-indigo-500/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs transition-transform inline-block ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  >
                    &#9654;
                  </span>
                  <span className="bg-slate-700/50 text-slate-300 text-xs px-2 py-0.5 rounded-md">
                    {jobType}
                  </span>
                  <span className="text-sm font-mono text-slate-300">
                    {label}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(report.lastModified).toLocaleString("ja-JP")}
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="mx-2 rounded-b-xl border border-t-0 border-slate-700/50 bg-slate-800/30 px-4 py-4">
                {loading === report.key && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-600 border-t-indigo-400 rounded-full" />
                    Loading...
                  </div>
                )}
                {error && expanded === report.key && !cache[report.key] && (
                  <p className="text-sm text-rose-400">{error}</p>
                )}
                {cache[report.key] && (
                  <ReportContent data={cache[report.key]} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
