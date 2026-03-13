"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const JOB_TYPES = [
  { id: "review_pull_requests", label: "PR Review", defaultSchedule: "cron(0 0 * * ? *)" },
  { id: "triage_issues", label: "Issue Triage", defaultSchedule: "cron(0 0 * * ? *)" },
  { id: "handle_dependabot", label: "Dependabot", defaultSchedule: "rate(6 hours)" },
  { id: "analyze_ci_failures", label: "CI Analysis", defaultSchedule: "rate(3 hours)" },
  { id: "check_dependencies", label: "Dep Check", defaultSchedule: "cron(0 0 ? * MON *)" },
  { id: "repo_health_check", label: "Health Check", defaultSchedule: "cron(0 0 ? * MON *)" },
];

const selectClass =
  "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-colors";

export default function RepoSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const repoId = `${owner}#${repo}`;

  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/repos?repoId=${encodeURIComponent(repoId)}`)
      .then((res) => res.json())
      .then(setConfig);
  }, [repoId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/repos?repoId=${encodeURIComponent(repoId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      router.push(`/repos/${owner}/${repo}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove patrol configuration for ${owner}/${repo}?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/repos?repoId=${encodeURIComponent(repoId)}`, {
        method: "DELETE",
      });
      router.push("/");
    } finally {
      setDeleting(false);
    }
  };

  if (!config) {
    return <p className="text-slate-500">Loading...</p>;
  }

  return (
    <div className="max-w-2xl">
      <Link
        href={`/repos/${owner}/${repo}`}
        className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        &larr; Back
      </Link>
      <h2 className="text-2xl font-bold text-white mt-1 mb-6">
        Settings: {owner}/{repo}
      </h2>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 space-y-5">
        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) =>
                setConfig({ ...config, enabled: e.target.checked })
              }
              className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/20"
            />
            <span className="text-sm font-medium text-slate-200">Enabled</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Model ID
          </label>
          <select
            value={config.model_id || ""}
            onChange={(e) =>
              setConfig({ ...config, model_id: e.target.value })
            }
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

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-3">
          Job Configuration
        </h3>
        <div className="space-y-3">
          {JOB_TYPES.map((jobType) => {
            const job = config.jobs?.[jobType.id];
            const enabled = job?.enabled ?? false;
            const schedule = job?.schedule ?? jobType.defaultSchedule;
            return (
              <div
                key={jobType.id}
                className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          jobs: {
                            ...config.jobs,
                            [jobType.id]: {
                              ...config.jobs?.[jobType.id],
                              enabled: e.target.checked,
                              schedule,
                            },
                          },
                        })
                      }
                      className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/20"
                    />
                    <span className="font-medium text-slate-200">
                      {jobType.label}
                    </span>
                  </label>
                </div>
                {enabled && (
                  <div>
                    <label className="text-xs text-slate-500">Schedule</label>
                    <input
                      type="text"
                      value={schedule}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          jobs: {
                            ...config.jobs,
                            [jobType.id]: {
                              ...config.jobs?.[jobType.id],
                              enabled: true,
                              schedule: e.target.value,
                            },
                          },
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-slate-300 mt-1 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium hover:from-indigo-500 hover:to-indigo-400 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 rounded-xl border border-rose-500/20 bg-rose-500/5 p-6">
        <h3 className="text-sm font-semibold text-rose-400 mb-3">
          Remove Patrol Configuration
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          This will remove the patrol configuration and all associated schedules
          for this repository. The repository itself will not be affected.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-rose-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-rose-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? "Removing..." : "Remove Patrol Config"}
        </button>
      </div>
    </div>
  );
}
