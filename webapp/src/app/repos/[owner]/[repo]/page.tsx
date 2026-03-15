import {
  DynamoDBClient,
  QueryCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

const dynamodb = new DynamoDBClient({});
const s3 = new S3Client({});

export const dynamic = "force-dynamic";

async function getRepoConfig(owner: string, repo: string) {
  try {
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: process.env.REPOS_TABLE_NAME,
        Key: marshall({ repo_id: `${owner}#${repo}` }),
      })
    );
    return result.Item ? unmarshall(result.Item) : null;
  } catch {
    return null;
  }
}

async function getJobHistory(owner: string, repo: string) {
  try {
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: process.env.JOB_HISTORY_TABLE_NAME,
        KeyConditionExpression: "repo_id = :rid",
        ExpressionAttributeValues: marshall({ ":rid": `${owner}#${repo}` }),
        ScanIndexForward: false,
        Limit: 20,
      })
    );
    return (result.Items || []).map((item) => unmarshall(item));
  } catch {
    return [];
  }
}

async function getLatestReports(owner: string, repo: string) {
  try {
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.REPORT_BUCKET_NAME,
        Prefix: `reports/${owner}/${repo}/`,
        MaxKeys: 20,
      })
    );
    return (result.Contents || [])
      .sort(
        (a, b) =>
          (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
      )
      .slice(0, 10);
  } catch {
    return [];
  }
}

export default async function RepoDetailPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  try {
    await getSession();
  } catch {
    redirect("/sign-in");
  }
  const { owner, repo } = await params;
  const [config, history, reports] = await Promise.all([
    getRepoConfig(owner, repo),
    getJobHistory(owner, repo),
    getLatestReports(owner, repo),
  ]);

  if (!config) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Repository not found.</p>
        <Link
          href="/"
          className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            &larr; Dashboard
          </Link>
          <h2 className="text-2xl font-bold text-white mt-1">
            {owner}/{repo}
          </h2>
        </div>
        <Link
          href={`/repos/${owner}/${repo}/settings`}
          className="border border-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm hover:bg-slate-800 hover:border-slate-600 transition-all"
        >
          Settings
        </Link>
      </div>

      {/* Job Status */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">Active Jobs</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries((config.jobs as Record<string, any>) || {}).map(
            ([jobType, jobConfig]) => (
              <div
                key={jobType}
                className={`rounded-xl border p-4 ${
                  jobConfig.enabled
                    ? "bg-slate-800/50 border-emerald-500/30"
                    : "bg-slate-900/30 border-slate-700/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      jobConfig.enabled
                        ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                        : "bg-slate-600"
                    }`}
                  />
                  <span className="font-medium text-sm text-slate-200">
                    {jobType}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {jobConfig.schedule || "default"}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      {/* Recent Job History */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">
          Recent Executions
        </h3>
        {history.length === 0 ? (
          <p className="text-slate-500 text-sm">No executions yet.</p>
        ) : (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">
                    Job
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">
                    Summary
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-700/50 hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(item.executed_at).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      {item.job_type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-medium ${
                          item.status === "success"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : item.status === "failed"
                              ? "bg-rose-500/10 text-rose-400"
                              : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                      {item.summary}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {item.duration_ms
                        ? `${(item.duration_ms / 1000).toFixed(1)}s`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Reports */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">
          Recent Reports
        </h3>
        {reports.length === 0 ? (
          <p className="text-slate-500 text-sm">No reports yet.</p>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.Key}
                className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-4 py-3 flex items-center justify-between hover:border-indigo-500/30 transition-colors"
              >
                <span className="text-sm font-mono text-slate-300">
                  {report.Key?.split("/").slice(-2).join("/")}
                </span>
                <span className="text-xs text-slate-500">
                  {report.LastModified?.toLocaleString("ja-JP")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
