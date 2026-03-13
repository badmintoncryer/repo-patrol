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

export interface RepoPatrolProps {
  /** Secrets Manager secret containing GitHub App credentials (app_id, private_key) */
  readonly githubAppSecret: secretsmanager.ISecret;

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
      reposTableName: this.registry.reposTable.tableName,
      jobHistoryTableName: this.registry.jobHistoryTable.tableName,
      processedItemsTableName: this.registry.processedItemsTable.tableName,
      modelId: props.modelId,
      maxToolCalls: props.maxToolCalls,
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

    // Optional: Next.js Dashboard with Cognito auth
    if (props.enableDashboard !== false) {
      this.frontend = new ReportFrontend(this, 'Frontend', {
        reportBucket: this.reportBucket,
        reposTable: this.registry.reposTable,
        jobHistoryTable: this.registry.jobHistoryTable,
        githubAppSecret: props.githubAppSecret,
        mfaRequired: props.mfaRequired,
        adminEmails: props.adminEmails,
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
        // Fixed value — cleanup only runs on stack deletion, not on every deploy
        Version: '1',
      },
    });
  }
}
