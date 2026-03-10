import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { AgentScheduler, JobType } from './agent-scheduler';
import { RepoRegistry } from './repo-registry';
import { ReportFrontend } from './report-frontend';
import { StrandsAgentRuntime } from './strands-agent-runtime';

export interface RepoPatrolProps {
  /** ARN of the Secrets Manager secret containing GitHub App credentials (app_id, private_key) */
  readonly githubAppSecretArn: string;

  /** Default Bedrock model ID */
  readonly modelId?: string;

  /** Maximum tool calls per agent invocation */
  readonly maxToolCalls?: number;

  /**
   * Default schedules per job type (EventBridge schedule expressions).
   * Keys are JobType enum values (e.g. 'review_pull_requests').
   */
  readonly defaultSchedules?: { [key: string]: string };

  /** Enable the Next.js dashboard with Cognito authentication */
  readonly enableDashboard?: boolean;

  /** Run in dry-run mode (no GitHub write operations) */
  readonly dryRun?: boolean;
}

const DEFAULT_SCHEDULES: { [key: string]: string } = {
  [JobType.REVIEW_PULL_REQUESTS]: 'cron(0 0 * * ? *)', // Daily JST 9:00
  [JobType.TRIAGE_ISSUES]: 'cron(0 0 * * ? *)',
  [JobType.HANDLE_DEPENDABOT]: 'rate(6 hours)',
  [JobType.ANALYZE_CI_FAILURES]: 'rate(3 hours)',
  [JobType.CHECK_DEPENDENCIES]: 'cron(0 0 ? * MON *)', // Weekly Monday JST 9:00
  [JobType.REPO_HEALTH_CHECK]: 'cron(0 0 ? * MON *)',
};

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

    // Merge default schedules with user overrides
    const schedules = { ...DEFAULT_SCHEDULES, ...props.defaultSchedules };

    // EventBridge Dispatcher Lambda + Scheduler IAM Role
    // Must be created before RepoRegistry (Registry needs dispatcherFunctionArn and schedulerRoleArn)
    this.scheduler = new AgentScheduler(this, 'Scheduler', {
      agentRuntime: this.agentRuntime.runtime,
      reposTableName: 'repo-patrol-repos',
    });

    // DynamoDB tables + Registry API (manages dynamic EventBridge Schedules)
    this.registry = new RepoRegistry(this, 'Registry', {
      dispatcherFunctionArn: this.scheduler.dispatcherFunction.functionArn,
      schedulerRoleArn: this.scheduler.schedulerRole.roleArn,
      defaultSchedules: schedules,
    });

    // Fix circular reference: grant DynamoDB read to dispatcher after table creation
    this.registry.reposTable.grantReadData(this.scheduler.dispatcherFunction);

    // Update AgentRuntime environment with actual table names
    // (table names are hardcoded above to break circular dependency)

    // Custom Resource: clean up all dynamic repo-patrol-* EventBridge Schedules on stack deletion
    this.addScheduleCleanup();

    // Optional: Next.js Dashboard with Cognito auth
    if (props.enableDashboard !== false) {
      this.frontend = new ReportFrontend(this, 'Frontend', {
        reportBucket: this.reportBucket,
        reposTable: this.registry.reposTable,
        jobHistoryTable: this.registry.jobHistoryTable,
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
        // Force update on redeploy to keep the cleanup Lambda fresh
        Version: Date.now().toString(),
      },
    });
  }
}
