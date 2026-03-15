import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { ScheduleExpression } from 'aws-cdk-lib/aws-scheduler';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { AgentScheduler } from './agent-scheduler';
import { RepoRegistry } from './repo-registry';
import { ReportFrontend } from './report-frontend';
import { StrandsAgentRuntime } from './strands-agent-runtime';

/**
 * Per-job schedule configuration.
 */
export interface JobScheduleConfig {
  /**
   * Whether this job is enabled.
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * EventBridge schedule expression for this job.
   * @default - Daily at UTC 00:00
   */
  readonly schedule?: ScheduleExpression;

  /**
   * Override model ID for this specific job.
   * @default - Uses the repository-level or construct-level modelId
   */
  readonly modelId?: string;
}

/**
 * Repository configuration for IaC-managed repositories.
 */
export interface RepositoryConfig {
  /** GitHub repository owner (organization or user) */
  readonly owner: string;

  /** GitHub repository name */
  readonly repo: string;

  /**
   * Default model ID for this repository.
   * @default - Uses the construct-level modelId
   */
  readonly modelId?: string;

  /**
   * Job type configurations.
   * Only specified jobs are enabled; unspecified jobs are not registered.
   * Use `JobType` enum values as keys.
   *
   * @example
   * {
   *   [JobType.REVIEW_PULL_REQUESTS]: { schedule: ScheduleExpression.cron({ hour: '1', minute: '0' }) },
   *   [JobType.HANDLE_DEPENDABOT]: { schedule: ScheduleExpression.rate(Duration.hours(6)) },
   * }
   */
  readonly jobs: { [key: string]: JobScheduleConfig };
}

export interface RepoPatrolProps {
  /** Secrets Manager secret containing GitHub App credentials (app_id, private_key) */
  readonly githubAppSecret: secretsmanager.ISecret;

  /** Default Bedrock model ID */
  readonly modelId?: string;

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

  /**
   * Repositories to register on deployment.
   * GitHub App installation ID is resolved automatically.
   * UI changes to these repositories will cause drift but are acceptable.
   * @default - No repositories are registered via IaC
   */
  readonly repositories?: RepositoryConfig[];
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
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    // DynamoDB tables + Registry API (manages dynamic EventBridge Schedules)
    this.registry = new RepoRegistry(this, 'Registry', {
      fallbackSchedule: FALLBACK_SCHEDULE_STRING,
    });

    // Strands Agent on Bedrock AgentCore
    this.agentRuntime = new StrandsAgentRuntime(this, 'AgentRuntime', {
      reportBucket: this.reportBucket,
      githubAppSecret: props.githubAppSecret,
      reposTable: this.registry.reposTable,
      jobHistoryTable: this.registry.jobHistoryTable,
      processedItemsTable: this.registry.processedItemsTable,
      modelId: props.modelId,
      dryRun: props.dryRun,
    });

    // EventBridge Dispatcher Lambda + Scheduler IAM Role
    this.scheduler = new AgentScheduler(this, 'Scheduler', {
      agentRuntime: this.agentRuntime.runtime,
      reposTableName: this.registry.reposTable.tableName,
    });

    // Wire up Registry Lambda with Scheduler info (deferred to avoid circular dependency)
    this.registry.registryFunction.addEnvironment('DISPATCHER_FUNCTION_ARN', this.scheduler.dispatcherFunction.functionArn);
    this.registry.registryFunction.addEnvironment('SCHEDULER_ROLE_ARN', this.scheduler.schedulerRole.roleArn);
    this.registry.registryFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [this.scheduler.schedulerRole.roleArn],
      }),
    );

    // Grant DynamoDB read to dispatcher
    this.registry.reposTable.grantReadData(this.scheduler.dispatcherFunction);

    // Custom Resource: clean up all dynamic repo-patrol-* EventBridge Schedules on stack deletion
    this.addScheduleCleanup();

    // IaC-managed repositories
    if (props.repositories && props.repositories.length > 0) {
      this.addRepoSeeder(props.repositories, props.githubAppSecret);
    }

    // Optional: Next.js Dashboard with Cognito auth
    if (props.enableDashboard !== false) {
      this.frontend = new ReportFrontend(this, 'Frontend', {
        reportBucket: this.reportBucket,
        reposTable: this.registry.reposTable,
        jobHistoryTable: this.registry.jobHistoryTable,
        registryFunction: this.registry.registryFunction,
        githubAppSecret: props.githubAppSecret,
        mfaRequired: props.mfaRequired,
        adminEmails: props.adminEmails,
      });
    }
  }

  /**
   * Add Custom Resources to register IaC-managed repositories.
   * One Custom Resource per repository for proper lifecycle management.
   */
  private addRepoSeeder(
    repositories: RepositoryConfig[],
    githubAppSecret: secretsmanager.ISecret,
  ) {
    const seederFunction = new nodejs.NodejsFunction(
      this,
      'RepoSeederFunction',
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        handler: 'handler',
        entry: path.join(__dirname, 'handlers/repo-seeder.ts'),
        timeout: cdk.Duration.minutes(5),
        memorySize: 256,
        environment: {
          REGISTRY_FUNCTION_NAME:
            this.registry.registryFunction.functionName,
          GITHUB_APP_SECRET_NAME: githubAppSecret.secretName,
        },
        bundling: {
          minify: true,
          sourceMap: true,
        },
      },
    );

    // Grant invoke on Registry Lambda and read on GitHub App secret
    this.registry.registryFunction.grantInvoke(seederFunction);
    githubAppSecret.grantRead(seederFunction);

    const provider = new cr.Provider(this, 'RepoSeederProvider', {
      onEventHandler: seederFunction,
    });

    for (const repoConfig of repositories) {
      // Convert JobScheduleConfig to serializable form
      const jobsPayload: Record<
        string,
        { enabled: boolean; schedule: string; model_id?: string }
      > = {};
      for (const [jobType, config] of Object.entries(repoConfig.jobs)) {
        jobsPayload[jobType] = {
          enabled: config.enabled ?? true,
          schedule:
            config.schedule?.expressionString ?? FALLBACK_SCHEDULE_STRING,
          ...(config.modelId && { model_id: config.modelId }),
        };
      }

      const sanitizedId = `${repoConfig.owner}${repoConfig.repo}`.replace(
        /[^a-zA-Z0-9]/g,
        '',
      );

      new cdk.CustomResource(this, `RepoSeed${sanitizedId}`, {
        serviceToken: provider.serviceToken,
        properties: {
          Owner: repoConfig.owner,
          Repo: repoConfig.repo,
          Jobs: JSON.stringify(jobsPayload),
          ModelId: repoConfig.modelId ?? '',
        },
      });
    }
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
        actions: ['scheduler:ListSchedules'],
        resources: ['*'],
      }),
    );
    cleanupFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['scheduler:DeleteSchedule'],
        resources: ['arn:aws:scheduler:*:*:schedule/default/repo-patrol-*'],
      }),
    );

    const provider = new cr.Provider(this, 'ScheduleCleanupProvider', {
      onEventHandler: cleanupFunction,
    });

    new cdk.CustomResource(this, 'ScheduleCleanup', {
      serviceToken: provider.serviceToken,
      properties: {
        // Fixed value — cleanup only runs on stack deletion, not on every deploy
        Version: '1',
      },
    });
  }
}
