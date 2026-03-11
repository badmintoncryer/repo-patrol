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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Monitored Repositories</h2>
        <Link
          href="/repos/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Add Repository
        </Link>
      </div>

      {repos.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">
            No repositories registered yet.
          </p>
          <Link
            href="/repos/new"
            className="text-blue-600 hover:underline"
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
                className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {repo.owner}/{repo.repo}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {enabledJobs.length} jobs active
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-3 h-3 rounded-full ${
                        repo.enabled ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <span className="text-sm text-gray-500">
                      {repo.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {enabledJobs.map(([jobType]) => (
                    <span
                      key={jobType}
                      className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
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
