import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { ScheduleExpression } from 'aws-cdk-lib/aws-scheduler';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { AgentScheduler, JobType } from './agent-scheduler';
import { RepoRegistry } from './repo-registry';
import { ReportFrontend } from './report-frontend';
import { StrandsAgentRuntime } from './strands-agent-runtime';

/**
 * Per-job configuration within a repository.
 */
export interface JobConfig {
  /**
   * Whether this job is enabled.
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * Schedule for this job.
   * @default - Daily at UTC 00:00 (cron(0 0 * * ? *))
   */
  readonly schedule?: ScheduleExpression;

  /**
   * Override the Bedrock model ID for this specific job.
   * @default - Uses the repository-level or construct-level model ID
   */
  readonly modelId?: string;
}

/**
 * Configuration for a monitored GitHub repository.
 */
export interface RepositoryConfig {
  /** GitHub repository owner (user or organization) */
  readonly owner: string;

  /** GitHub repository name */
  readonly repo: string;

  /** GitHub App installation ID for this repository */
  readonly githubAppInstallationId: number;

  /**
   * Per-job-type configuration.
   * Keys are JobType enum values (e.g. 'review_pull_requests').
   * Omitted job types use the default schedule and are enabled.
   */
  readonly jobs?: { [jobType: string]: JobConfig };

  /**
   * Override the Bedrock model ID for this repository.
   * @default - Uses the construct-level model ID
   */
  readonly modelId?: string;
}

export interface RepoPatrolProps {
  /** ARN of the Secrets Manager secret containing GitHub App credentials (app_id, private_key) */
  readonly githubAppSecretArn: string;

  /**
   * Repositories to monitor.
   * Each repository gets independent EventBridge Schedules per job type.
   * Additional repositories can be added dynamically via the Registry API.
   */
  readonly repositories?: RepositoryConfig[];

  /** Default Bedrock model ID */
  readonly modelId?: string;

  /** Maximum tool calls per agent invocation */
  readonly maxToolCalls?: number;

  /** Enable the Next.js dashboard with Cognito authentication */
  readonly enableDashboard?: boolean;

  /** Run in dry-run mode (no GitHub write operations) */
  readonly dryRun?: boolean;

  /**
   * Whether to require MFA (TOTP) for dashboard login.
   * @default true
   */
  readonly mfaRequired?: boolean;

  /**
   * Email addresses for admin users to create in the Cognito User Pool.
   * Each user receives an invitation email from Cognito with a temporary password.
   * Requires enableDashboard to be true (default).
   * @default - No admin users are created
   */
  readonly adminEmails?: string[];
}

/**
 * Fallback schedule when no schedule is configured for a job type.
 * Daily at UTC 00:00.
 */
const FALLBACK_SCHEDULE = ScheduleExpression.cron({ hour: '0', minute: '0' });
const FALLBACK_SCHEDULE_STRING = FALLBACK_SCHEDULE.expressionString;

export class RepoPatrol extends Construct {
  public readonly reportBucket: s3.Bucket;
  public readonly registry: RepoRegistry;
  public readonly agentRuntime: StrandsAgentRuntime;
  public readonly scheduler: AgentScheduler;
  public readonly frontend?: ReportFrontend;

  constructor(scope: Construct, id: string, props: RepoPatrolProps) {
    super(scope, id);

    // S3 bucket for reports
    this.reportBucket = new s3.Bucket(this, 'ReportBucket', {
      bucketName: `repo-patrol-reports-${cdk.Aws.ACCOUNT_ID}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    // Strands Agent on Bedrock AgentCore
    this.agentRuntime = new StrandsAgentRuntime(this, 'AgentRuntime', {
      reportBucket: this.reportBucket,
      githubAppSecretArn: props.githubAppSecretArn,
      reposTableName: 'repo-patrol-repos',
      jobHistoryTableName: 'repo-patrol-job-history',
      processedItemsTableName: 'repo-patrol-processed-items',
      modelId: props.modelId,
      maxToolCalls: props.maxToolCalls,
      dryRun: props.dryRun,
    });

    // EventBridge Dispatcher Lambda + Scheduler IAM Role
    this.scheduler = new AgentScheduler(this, 'Scheduler', {
      agentRuntime: this.agentRuntime.runtime,
      reposTableName: 'repo-patrol-repos',
    });

    // DynamoDB tables + Registry API (manages dynamic EventBridge Schedules)
    this.registry = new RepoRegistry(this, 'Registry', {
      dispatcherFunctionArn: this.scheduler.dispatcherFunction.functionArn,
      schedulerRoleArn: this.scheduler.schedulerRole.roleArn,
      fallbackSchedule: FALLBACK_SCHEDULE_STRING,
    });

    // Grant DynamoDB read to dispatcher (circular dependency workaround)
    this.registry.reposTable.grantReadData(this.scheduler.dispatcherFunction);

    // Custom Resource: clean up all dynamic repo-patrol-* EventBridge Schedules on stack deletion
    this.addScheduleCleanup();

    // Seed initial repositories via Custom Resource
    if (props.repositories && props.repositories.length > 0) {
      this.seedRepositories(props.repositories);
    }

    // Optional: Next.js Dashboard with Cognito auth
    if (props.enableDashboard !== false) {
      this.frontend = new ReportFrontend(this, 'Frontend', {
        reportBucket: this.reportBucket,
        reposTable: this.registry.reposTable,
        jobHistoryTable: this.registry.jobHistoryTable,
        mfaRequired: props.mfaRequired,
        adminEmails: props.adminEmails,
      });
    }
  }

  /**
   * Seed initial repositories into DynamoDB and create their EventBridge Schedules.
   * Uses a Custom Resource so repos are registered on every deploy (idempotent upsert).
   */
  private seedRepositories(repositories: RepositoryConfig[]) {
    // Serialize repos config for the seeder Lambda
    const reposPayload = repositories.map((repo) => {
      const jobs: { [jobType: string]: { enabled: boolean; schedule: string; model_id: string } } = {};

      // Build jobs config for each job type
      for (const jobType of Object.values(JobType)) {
        const jobConfig = repo.jobs?.[jobType];
        jobs[jobType] = {
          enabled: jobConfig?.enabled ?? true,
          schedule: jobConfig?.schedule?.expressionString ?? FALLBACK_SCHEDULE_STRING,
          model_id: jobConfig?.modelId ?? '',
        };
      }

      return {
        owner: repo.owner,
        repo: repo.repo,
        github_app_installation_id: repo.githubAppInstallationId,
        model_id: repo.modelId ?? '',
        jobs,
      };
    });

    const seederFunction = new nodejs.NodejsFunction(this, 'RepoSeederFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'handler',
      entry: path.join(__dirname, 'handlers/repo-seeder.ts'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      environment: {
        REPOS_TABLE_NAME: this.registry.reposTable.tableName,
        DISPATCHER_FUNCTION_ARN: this.scheduler.dispatcherFunction.functionArn,
        SCHEDULER_ROLE_ARN: this.scheduler.schedulerRole.roleArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    this.registry.reposTable.grantReadWriteData(seederFunction);

    seederFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'scheduler:CreateSchedule',
          'scheduler:UpdateSchedule',
          'scheduler:GetSchedule',
        ],
        resources: ['arn:aws:scheduler:*:*:schedule/default/repo-patrol-*'],
      }),
    );

    seederFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [this.scheduler.schedulerRole.roleArn],
      }),
    );

    const provider = new cr.Provider(this, 'RepoSeederProvider', {
      onEventHandler: seederFunction,
    });

    new cdk.CustomResource(this, 'RepoSeeder', {
      serviceToken: provider.serviceToken,
      properties: {
        // Repositories config — triggers update when changed
        Repositories: JSON.stringify(reposPayload),
      },
    });
  }

  /**
   * Add a Custom Resource that deletes all repo-patrol-* EventBridge Schedules
   * when the CloudFormation stack is deleted. This prevents orphaned schedules.
   */
  private addScheduleCleanup() {
    const cleanupFunction = new nodejs.NodejsFunction(
      this,
      'ScheduleCleanupFunction',
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        handler: 'handler',
        entry: path.join(__dirname, 'handlers/schedule-cleanup.ts'),
        timeout: cdk.Duration.minutes(5),
        memorySize: 256,
        bundling: {
          minify: true,
          sourceMap: true,
        },
      },
    );

    cleanupFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'scheduler:ListSchedules',
          'scheduler:DeleteSchedule',
        ],
        resources: ['*'],
      }),
    );

    const provider = new cr.Provider(this, 'ScheduleCleanupProvider', {
      onEventHandler: cleanupFunction,
    });

    new cdk.CustomResource(this, 'ScheduleCleanup', {
      serviceToken: provider.serviceToken,
      properties: {
        Version: Date.now().toString(),
      },
    });
  }
}
