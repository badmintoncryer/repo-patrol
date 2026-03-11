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
  {
    id: "repo_health_check",
    label: "Health Check",
    defaultSchedule: "cron(0 0 ? * MON *)",
  },
];

export default function NewRepoPage() {
  const router = useRouter();
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [installationId, setInstallationId] = useState("");
  const [modelId, setModelId] = useState("");
  const [jobs, setJobs] = useState<Record<string, { enabled: boolean; schedule: string }>>(
    Object.fromEntries(
      JOB_TYPES.map((j) => [j.id, { enabled: true, schedule: j.defaultSchedule }])
    )
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo,
          github_app_installation_id: Number(installationId),
          model_id: modelId || undefined,
          jobs,
        }),
      });

      if (res.ok) {
        router.push("/");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Add Repository</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Owner</label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="github-org"
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Repository</label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="repo-name"
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            GitHub App Installation ID
          </label>
          <input
            type="number"
            value={installationId}
            onChange={(e) => setInstallationId(e.target.value)}
            placeholder="12345678"
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Model ID (optional, overrides default)
          </label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
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

        <div>
          <h3 className="text-lg font-semibold mb-3">Job Configuration</h3>
          <div className="space-y-3">
            {JOB_TYPES.map((jobType) => (
              <div
                key={jobType.id}
                className="bg-white border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2">
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
                    />
                    <span className="font-medium">{jobType.label}</span>
                  </label>
                </div>
                {jobs[jobType.id]?.enabled && (
                  <div>
                    <label className="text-xs text-gray-500">Schedule</label>
                    <input
                      type="text"
                      value={jobs[jobType.id]?.schedule ?? jobType.defaultSchedule}
                      onChange={(e) =>
                        setJobs((prev) => ({
                          ...prev,
                          [jobType.id]: {
                            ...prev[jobType.id],
                            schedule: e.target.value,
                          },
                        }))
                      }
                      className="w-full border rounded px-2 py-1 text-sm mt-1"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add Repository"}
        </button>
      </form>
    </div>
  );
}
