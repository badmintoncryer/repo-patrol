"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const JOB_TYPES = [
  {
    id: "review_pull_requests",
    label: "PR Review",
    defaultSchedule: "cron(0 0 * * ? *)",
  },
  {
    id: "triage_issues",
    label: "Issue Triage",
    defaultSchedule: "cron(0 0 * * ? *)",
  },
  {
    id: "handle_dependabot",
    label: "Dependabot",
    defaultSchedule: "rate(6 hours)",
  },
  {
    id: "analyze_ci_failures",
    label: "CI Analysis",
    defaultSchedule: "rate(3 hours)",
  },
  {
    id: "check_dependencies",
    label: "Dep Check",
    defaultSchedule: "cron(0 0 ? * MON *)",
  },
];

const inputClass =
  "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-colors";

const selectClass =
  "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-colors";

export default function NewRepoPage() {
  const router = useRouter();
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [modelId, setModelId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<
    Record<string, { enabled: boolean; schedule: string }>
  >(
    Object.fromEntries(
      JOB_TYPES.map((j) => [
        j.id,
        { enabled: true, schedule: j.defaultSchedule },
      ])
    )
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo,
          model_id: modelId || undefined,
          jobs,
        }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add repository");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">Add Repository</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Owner
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="github-org"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Repository
              </label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="repo-name"
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Model ID (optional, overrides default)
            </label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className={selectClass}
            >
              <option value="">Default (Haiku 4.5)</option>
              <option value="us.anthropic.claude-haiku-4-5-20251001-v1:0">
                Claude Haiku 4.5
              </option>
              <option value="us.anthropic.claude-sonnet-4-20250514-v1:0">
                Claude Sonnet 4
              </option>
              <option value="us.anthropic.claude-sonnet-4-5-20250929-v1:0">
                Claude Sonnet 4.5
              </option>
            </select>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            Job Configuration
          </h3>
          <div className="space-y-3">
            {JOB_TYPES.map((jobType) => (
              <div
                key={jobType.id}
                className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={jobs[jobType.id]?.enabled ?? true}
                      onChange={(e) =>
                        setJobs((prev) => ({
                          ...prev,
                          [jobType.id]: {
                            ...prev[jobType.id],
                            enabled: e.target.checked,
                          },
                        }))
                      }
                      className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/20"
                    />
                    <span className="font-medium text-slate-200">
                      {jobType.label}
                    </span>
                  </label>
                </div>
                {jobs[jobType.id]?.enabled && (
                  <div>
                    <label className="text-xs text-slate-500">Schedule</label>
                    <input
                      type="text"
                      value={
                        jobs[jobType.id]?.schedule ?? jobType.defaultSchedule
                      }
                      onChange={(e) =>
                        setJobs((prev) => ({
                          ...prev,
                          [jobType.id]: {
                            ...prev[jobType.id],
                            schedule: e.target.value,
                          },
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-slate-300 mt-1 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium hover:from-indigo-500 hover:to-indigo-400 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Adding..." : "Add Repository"}
        </button>
      </form>
    </div>
  );
}
