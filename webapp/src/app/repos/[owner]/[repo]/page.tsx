import { DynamoDBClient, QueryCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import Link from "next/link";

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
      .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
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
  const { owner, repo } = await params;
  const [config, history, reports] = await Promise.all([
    getRepoConfig(owner, repo),
    getJobHistory(owner, repo),
    getLatestReports(owner, repo),
  ]);

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Repository not found.</p>
        <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Dashboard
          </Link>
          <h2 className="text-2xl font-bold mt-1">
            {owner}/{repo}
          </h2>
        </div>
        <Link
          href={`/repos/${owner}/${repo}/settings`}
          className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          Settings
        </Link>
      </div>

      {/* Job Status */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Active Jobs</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries((config.jobs as Record<string, any>) || {}).map(
            ([jobType, jobConfig]) => (
              <div
                key={jobType}
                className={`border rounded-lg p-4 ${
                  jobConfig.enabled
                    ? "bg-white border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      jobConfig.enabled ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="font-medium text-sm">{jobType}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {jobConfig.schedule || "default"}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      {/* Recent Job History */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Recent Executions</h3>
        {history.length === 0 ? (
          <p className="text-gray-500 text-sm">No executions yet.</p>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Job</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Summary</th>
                  <th className="text-left px-4 py-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(item.executed_at).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-2">{item.job_type}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                          item.status === "success"
                            ? "bg-green-100 text-green-700"
                            : item.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600 max-w-xs truncate">
                      {item.summary}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {item.duration_ms ? `${(item.duration_ms / 1000).toFixed(1)}s` : "-"}
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
        <h3 className="text-lg font-semibold mb-3">Recent Reports</h3>
        {reports.length === 0 ? (
          <p className="text-gray-500 text-sm">No reports yet.</p>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.Key}
                className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <span className="text-sm font-mono text-gray-600">
                  {report.Key?.split("/").slice(-2).join("/")}
                </span>
                <span className="text-xs text-gray-400">
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
