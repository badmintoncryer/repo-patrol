import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import Link from "next/link";

const dynamodb = new DynamoDBClient({});

interface Repo {
  repo_id: string;
  owner: string;
  repo: string;
  enabled: boolean;
  jobs: Record<string, { enabled: boolean }>;
  updated_at: string;
}

async function getRepos(): Promise<Repo[]> {
  try {
    const result = await dynamodb.send(
      new ScanCommand({ TableName: process.env.REPOS_TABLE_NAME })
    );
    return (result.Items || []).map((item) => unmarshall(item) as Repo);
  } catch {
    return [];
  }
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const repos = await getRepos();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white">
          Monitored Repositories
        </h2>
        <Link
          href="/repos/new"
          className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-indigo-500 hover:to-indigo-400 transition-all shadow-lg shadow-indigo-500/20"
        >
          + Add Repository
        </Link>
      </div>

      {repos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700/50 bg-slate-800/30 p-16 text-center">
          <p className="text-slate-400 mb-4">
            No repositories registered yet.
          </p>
          <Link
            href="/repos/new"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Add your first repository
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {repos.map((repo) => {
            const enabledJobs = Object.entries(repo.jobs || {}).filter(
              ([, v]) => v.enabled
            );
            return (
              <Link
                key={repo.repo_id}
                href={`/repos/${repo.owner}/${repo.repo}`}
                className="group rounded-xl border border-slate-700/50 bg-slate-800/50 p-6 hover:border-indigo-500/50 hover:bg-slate-800 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      {repo.owner}/{repo.repo}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {enabledJobs.length} jobs active
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        repo.enabled ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-slate-600"
                      }`}
                    />
                    <span className="text-sm text-slate-400">
                      {repo.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {enabledJobs.map(([jobType]) => (
                    <span
                      key={jobType}
                      className="bg-slate-700/50 text-slate-300 text-xs px-2.5 py-1 rounded-md"
                    >
                      {jobType}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
