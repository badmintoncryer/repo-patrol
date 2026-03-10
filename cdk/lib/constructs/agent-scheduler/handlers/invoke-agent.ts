/**
 * Dispatcher Lambda - invoked per (repo × jobType) by EventBridge Scheduler.
 * Receives a single repo+job payload and invokes AgentCore Runtime.
 */
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall, marshall } from "@aws-sdk/util-dynamodb";

const agentCoreClient = new BedrockAgentCoreClient({});
const dynamoClient = new DynamoDBClient({});

const AGENT_RUNTIME_ARN = process.env.AGENT_RUNTIME_ARN!;
const REPOS_TABLE_NAME = process.env.REPOS_TABLE_NAME!;

interface SchedulerEvent {
  repoId: string; // "owner#repo"
  jobType: string;
}

export const handler = async (event: SchedulerEvent) => {
  const { repoId, jobType } = event;
  console.log(`Dispatcher invoked for repo=${repoId}, job=${jobType}`);

  // Fetch repo config from DynamoDB
  const getResult = await dynamoClient.send(
    new GetItemCommand({
      TableName: REPOS_TABLE_NAME,
      Key: marshall({ repo_id: repoId }),
    })
  );

  if (!getResult.Item) {
    console.error(`Repo ${repoId} not found in DynamoDB`);
    return { repoId, jobType, status: "error", error: "repo not found" };
  }

  const repo = unmarshall(getResult.Item);

  if (!repo.enabled) {
    console.log(`Repo ${repoId} is disabled, skipping`);
    return { repoId, jobType, status: "skipped", reason: "repo disabled" };
  }

  const jobs = repo.jobs as Record<string, any> | undefined;
  const jobConfig = jobs?.[jobType];

  if (!jobConfig?.enabled) {
    console.log(`Job ${jobType} not enabled for ${repoId}, skipping`);
    return { repoId, jobType, status: "skipped", reason: "job disabled" };
  }

  const payload = {
    owner: repo.owner,
    repo: repo.repo,
    job_type: jobType,
    installation_id: repo.github_app_installation_id,
    model_id: jobConfig.model_id || repo.model_id,
    config: jobConfig.config || {},
    dry_run: repo.dry_run || false,
  };

  const sessionId = `patrol-${repo.owner}-${repo.repo}-${jobType}-${new Date().toISOString()}`;

  try {
    console.log(`Invoking agent for ${repoId}, job=${jobType}`);

    const command = new InvokeAgentRuntimeCommand({
      agentRuntimeArn: AGENT_RUNTIME_ARN,
      runtimeSessionId: sessionId,
      payload: new TextEncoder().encode(JSON.stringify(payload)),
    });

    const response = await agentCoreClient.send(command);
    const responseText = response.payload
      ? new TextDecoder().decode(response.payload)
      : "no response";

    return {
      repoId,
      jobType,
      status: "success",
      responseLength: responseText.length,
    };
  } catch (error) {
    console.error(`Error invoking agent for ${repoId}:`, error);
    return {
      repoId,
      jobType,
      status: "error",
      error: String(error),
    };
  }
};
