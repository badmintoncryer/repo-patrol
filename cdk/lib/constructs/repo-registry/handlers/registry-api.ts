import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  SchedulerClient,
  CreateScheduleCommand,
  UpdateScheduleCommand,
  DeleteScheduleCommand,
  GetScheduleCommand,
  FlexibleTimeWindowMode,
} from "@aws-sdk/client-scheduler";

const dynamoClient = new DynamoDBClient({});
const schedulerClient = new SchedulerClient({});

const TABLE_NAME = process.env.REPOS_TABLE_NAME!;
const DISPATCHER_FUNCTION_ARN = process.env.DISPATCHER_FUNCTION_ARN!;
const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN!;
const DEFAULT_SCHEDULES: Record<string, string> = JSON.parse(
  process.env.DEFAULT_SCHEDULES || "{}"
);

interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  body?: string;
  queryStringParameters?: Record<string, string>;
  pathParameters?: Record<string, string>;
}

function response(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}

/**
 * Build a schedule name from owner, repo, and job type.
 * EventBridge schedule names: [a-zA-Z0-9-_.] only, max 64 chars.
 */
function scheduleNameFor(owner: string, repo: string, jobType: string): string {
  const sanitized = `${owner}-${repo}-${jobType}`
    .replace(/[^a-zA-Z0-9\-_.]/g, "-")
    .slice(0, 50);
  return `repo-patrol-${sanitized}`;
}

/**
 * Create or update EventBridge Schedules for each enabled job in a repo.
 */
async function syncSchedules(
  owner: string,
  repo: string,
  jobs: Record<string, any>,
  enabled: boolean
) {
  for (const [jobType, jobConfig] of Object.entries(jobs)) {
    const name = scheduleNameFor(owner, repo, jobType);
    const scheduleExpression =
      jobConfig.schedule || DEFAULT_SCHEDULES[jobType] || "rate(1 day)";
    const isActive = enabled && jobConfig.enabled;

    const params = {
      Name: name,
      ScheduleExpression: scheduleExpression,
      ScheduleExpressionTimezone: "Asia/Tokyo",
      FlexibleTimeWindow: { Mode: FlexibleTimeWindowMode.OFF },
      Target: {
        Arn: DISPATCHER_FUNCTION_ARN,
        RoleArn: SCHEDULER_ROLE_ARN,
        Input: JSON.stringify({
          repoId: `${owner}#${repo}`,
          jobType,
        }),
      },
      State: isActive ? ("ENABLED" as const) : ("DISABLED" as const),
    };

    try {
      // Check if schedule exists
      await schedulerClient.send(new GetScheduleCommand({ Name: name }));
      // Update existing
      await schedulerClient.send(new UpdateScheduleCommand(params));
      console.log(`Updated schedule ${name} (${isActive ? "ENABLED" : "DISABLED"})`);
    } catch (e: any) {
      if (e.name === "ResourceNotFoundException") {
        // Create new
        await schedulerClient.send(new CreateScheduleCommand(params));
        console.log(`Created schedule ${name} (${isActive ? "ENABLED" : "DISABLED"})`);
      } else {
        throw e;
      }
    }
  }
}

/**
 * Delete all EventBridge Schedules for a repo.
 */
async function deleteSchedules(owner: string, repo: string) {
  const allJobTypes = Object.keys(DEFAULT_SCHEDULES);
  for (const jobType of allJobTypes) {
    const name = scheduleNameFor(owner, repo, jobType);
    try {
      await schedulerClient.send(new DeleteScheduleCommand({ Name: name }));
      console.log(`Deleted schedule ${name}`);
    } catch (e: any) {
      if (e.name !== "ResourceNotFoundException") {
        console.error(`Failed to delete schedule ${name}:`, e);
      }
    }
  }
}

export const handler = async (event: APIGatewayEvent) => {
  const method = event.httpMethod;
  const repoId = event.pathParameters?.repoId;

  try {
    // GET /repos - List all repos
    if (method === "GET" && !repoId) {
      const result = await dynamoClient.send(
        new ScanCommand({ TableName: TABLE_NAME })
      );
      const items = (result.Items || []).map((item) => unmarshall(item));
      return response(200, { repos: items });
    }

    // GET /repos/{repoId} - Get specific repo
    if (method === "GET" && repoId) {
      const result = await dynamoClient.send(
        new GetItemCommand({
          TableName: TABLE_NAME,
          Key: marshall({ repo_id: repoId }),
        })
      );
      if (!result.Item) {
        return response(404, { error: "Repository not found" });
      }
      return response(200, unmarshall(result.Item));
    }

    // POST /repos/sync - Re-sync all schedules from DynamoDB (consistency repair)
    if (method === "POST" && event.path?.endsWith("/sync")) {
      const result = await dynamoClient.send(
        new ScanCommand({ TableName: TABLE_NAME })
      );
      const items = (result.Items || []).map((item) => unmarshall(item));
      const results: Array<{ repo_id: string; status: string; error?: string }> = [];

      for (const repo of items) {
        try {
          await syncSchedules(
            repo.owner,
            repo.repo,
            repo.jobs || {},
            repo.enabled
          );
          results.push({ repo_id: repo.repo_id, status: "synced" });
        } catch (e) {
          results.push({ repo_id: repo.repo_id, status: "error", error: String(e) });
        }
      }

      return response(200, { synced: results.length, results });
    }

    // POST /repos - Create new repo + create EventBridge Schedules
    if (method === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { owner, repo, github_app_installation_id, jobs, model_id } = body;

      if (!owner || !repo || !github_app_installation_id) {
        return response(400, {
          error: "owner, repo, and github_app_installation_id are required",
        });
      }

      const now = new Date().toISOString();
      const repoIdValue = `${owner}#${repo}`;
      const item = {
        repo_id: repoIdValue,
        owner,
        repo,
        enabled: true,
        github_app_installation_id,
        model_id: model_id || "",
        jobs: jobs || {},
        created_at: now,
        updated_at: now,
      };

      // Write to DynamoDB first
      await dynamoClient.send(
        new PutItemCommand({
          TableName: TABLE_NAME,
          Item: marshall(item, { removeUndefinedValues: true }),
        })
      );

      // Create EventBridge Schedules — rollback DynamoDB on failure
      try {
        await syncSchedules(owner, repo, jobs || {}, true);
      } catch (scheduleError) {
        console.error("Failed to create schedules, rolling back DynamoDB:", scheduleError);
        // Best-effort cleanup of any partially created schedules
        try { await deleteSchedules(owner, repo); } catch (_) { /* ignore */ }
        // Roll back DynamoDB item
        await dynamoClient.send(
          new DeleteItemCommand({
            TableName: TABLE_NAME,
            Key: marshall({ repo_id: repoIdValue }),
          })
        );
        throw scheduleError;
      }

      return response(201, item);
    }

    // PUT /repos/{repoId} - Update repo + sync EventBridge Schedules
    if (method === "PUT" && repoId) {
      const body = JSON.parse(event.body || "{}");
      const now = new Date().toISOString();

      const updateExpressions: string[] = ["#updated_at = :updated_at"];
      const expressionNames: Record<string, string> = {
        "#updated_at": "updated_at",
      };
      const expressionValues: Record<string, any> = {
        ":updated_at": { S: now },
      };

      for (const [key, value] of Object.entries(body)) {
        if (key === "repo_id") continue;
        const attrName = `#${key}`;
        const attrValue = `:${key}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionNames[attrName] = key;
        expressionValues[attrValue] = marshall(value);
      }

      await dynamoClient.send(
        new UpdateItemCommand({
          TableName: TABLE_NAME,
          Key: marshall({ repo_id: repoId }),
          UpdateExpression: `SET ${updateExpressions.join(", ")}`,
          ExpressionAttributeNames: expressionNames,
          ExpressionAttributeValues: expressionValues,
        })
      );

      // Re-fetch full item to sync schedules
      const updated = await dynamoClient.send(
        new GetItemCommand({
          TableName: TABLE_NAME,
          Key: marshall({ repo_id: repoId }),
        })
      );

      let scheduleWarning: string | undefined;
      if (updated.Item) {
        const repo = unmarshall(updated.Item);
        try {
          await syncSchedules(
            repo.owner,
            repo.repo,
            repo.jobs || {},
            repo.enabled
          );
        } catch (scheduleError) {
          // DynamoDB update succeeded but schedule sync failed.
          // Return success with warning — caller can retry the update.
          console.error("Schedule sync failed after DynamoDB update:", scheduleError);
          scheduleWarning = "DynamoDB updated but schedule sync failed. Retry the update to fix.";
        }
      }

      return response(200, {
        repo_id: repoId,
        updated_at: now,
        ...(scheduleWarning && { warning: scheduleWarning }),
      });
    }

    // DELETE /repos/{repoId} - Delete repo + delete EventBridge Schedules
    if (method === "DELETE" && repoId) {
      // Fetch repo to get owner/repo for schedule cleanup
      const existing = await dynamoClient.send(
        new GetItemCommand({
          TableName: TABLE_NAME,
          Key: marshall({ repo_id: repoId }),
        })
      );

      if (existing.Item) {
        const repo = unmarshall(existing.Item);
        await deleteSchedules(repo.owner, repo.repo);
      }

      await dynamoClient.send(
        new DeleteItemCommand({
          TableName: TABLE_NAME,
          Key: marshall({ repo_id: repoId }),
        })
      );

      return response(200, { deleted: repoId });
    }

    return response(405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Registry API error:", error);
    return response(500, { error: String(error) });
  }
};
