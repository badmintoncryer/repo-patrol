"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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
    if (!confirm(`Delete ${owner}/${repo}?`)) return;
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
    return <p className="text-gray-500">Loading...</p>;
  }

  return (
    <div className="max-w-2xl">
      <Link
        href={`/repos/${owner}/${repo}`}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Back
      </Link>
      <h2 className="text-2xl font-bold mt-1 mb-6">
        Settings: {owner}/{repo}
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Enabled</label>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) =>
              setConfig({ ...config, enabled: e.target.checked })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Model ID</label>
          <select
            value={config.model_id || ""}
            onChange={(e) =>
              setConfig({ ...config, model_id: e.target.value })
            }
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

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Repository"}
          </button>
        </div>
      </div>
    </div>
  );
}
