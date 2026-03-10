/**
 * Custom Resource Lambda: Seed initial repositories into DynamoDB and create EventBridge Schedules.
 * Invoked on stack CREATE and UPDATE. Idempotent — upserts repos and schedules.
 */
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import {
  SchedulerClient,
  CreateScheduleCommand,
  UpdateScheduleCommand,
  GetScheduleCommand,
  FlexibleTimeWindowMode,
} from '@aws-sdk/client-scheduler';
import { marshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({});
const schedulerClient = new SchedulerClient({});

const TABLE_NAME = process.env.REPOS_TABLE_NAME!;
const DISPATCHER_FUNCTION_ARN = process.env.DISPATCHER_FUNCTION_ARN!;
const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN!;

interface RepoPayload {
  owner: string;
  repo: string;
  github_app_installation_id: number;
  model_id: string;
  jobs: Record<string, { enabled: boolean; schedule: string; model_id: string }>;
}

interface CloudFormationEvent {
  RequestType: 'Create' | 'Update' | 'Delete';
  ResourceProperties: { Repositories: string };
}

function scheduleNameFor(owner: string, repo: string, jobType: string): string {
  const sanitized = `${owner}-${repo}-${jobType}`
    .replace(/[^a-zA-Z0-9\-_.]/g, '-')
    .slice(0, 50);
  return `repo-patrol-${sanitized}`;
}

export const handler = async (event: CloudFormationEvent) => {
  console.log('Repo seeder event:', event.RequestType);

  // No action on DELETE — schedule-cleanup handles that
  if (event.RequestType === 'Delete') {
    return { Status: 'SUCCESS' };
  }

  const repos: RepoPayload[] = JSON.parse(event.ResourceProperties.Repositories);
  console.log(`Seeding ${repos.length} repositories`);

  for (const repo of repos) {
    const repoId = `${repo.owner}#${repo.repo}`;
    const now = new Date().toISOString();

    // Upsert DynamoDB item
    const item = {
      repo_id: repoId,
      owner: repo.owner,
      repo: repo.repo,
      enabled: true,
      github_app_installation_id: repo.github_app_installation_id,
      model_id: repo.model_id,
      jobs: repo.jobs,
      created_at: now,
      updated_at: now,
    };

    await dynamoClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall(item, { removeUndefinedValues: true }),
      }),
    );
    console.log(`Upserted repo: ${repoId}`);

    // Create/update EventBridge Schedules for each job
    for (const [jobType, jobConfig] of Object.entries(repo.jobs)) {
      const name = scheduleNameFor(repo.owner, repo.repo, jobType);
      const params = {
        Name: name,
        ScheduleExpression: jobConfig.schedule,
        ScheduleExpressionTimezone: 'UTC',
        FlexibleTimeWindow: { Mode: FlexibleTimeWindowMode.OFF },
        Target: {
          Arn: DISPATCHER_FUNCTION_ARN,
          RoleArn: SCHEDULER_ROLE_ARN,
          Input: JSON.stringify({ repoId, jobType }),
        },
        State: jobConfig.enabled ? ('ENABLED' as const) : ('DISABLED' as const),
      };

      try {
        await schedulerClient.send(new GetScheduleCommand({ Name: name }));
        await schedulerClient.send(new UpdateScheduleCommand(params));
        console.log(`Updated schedule: ${name}`);
      } catch (e: any) {
        if (e.name === 'ResourceNotFoundException') {
          await schedulerClient.send(new CreateScheduleCommand(params));
          console.log(`Created schedule: ${name}`);
        } else {
          throw e;
        }
      }
    }
  }

  return { Status: 'SUCCESS' };
};
