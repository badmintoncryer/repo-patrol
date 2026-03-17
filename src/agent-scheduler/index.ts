import * as path from 'path';
import { Runtime } from '@aws-cdk/aws-bedrock-agentcore-alpha';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

/**
 * Supported patrol job types.
 */
export enum JobType {
  /** Review open pull requests and post comments */
  REVIEW_PULL_REQUESTS = 'review_pull_requests',
  /** Triage issues with labels and comments */
  TRIAGE_ISSUES = 'triage_issues',
  /** Handle Dependabot PRs (auto-approve/merge) */
  HANDLE_DEPENDABOT = 'handle_dependabot',
  /** Analyze CI failure logs and suggest fixes */
  ANALYZE_CI_FAILURES = 'analyze_ci_failures',
  /** Check dependency updates */
  CHECK_DEPENDENCIES = 'check_dependencies',
}

export interface AgentSchedulerProps {
  readonly agentRuntime: Runtime;
  /** Repos table name (string to avoid circular dependency with RepoRegistry) */
  readonly reposTableName: string;
}

/**
 * Agent Scheduler construct.
 *
 * Provides a Dispatcher Lambda and a Scheduler IAM Role.
 * EventBridge Schedules are NOT created statically here —
 * they are created dynamically per (repo × jobType) by the Registry API
 * when repositories are registered or updated.
 *
 * NOTE: The caller must grant DynamoDB read access to dispatcherFunction
 * after the repos table is created (to break circular dependency).
 */
export class AgentScheduler extends Construct {
  public readonly dispatcherFunction: nodejs.NodejsFunction;
  public readonly schedulerRole: iam.Role;

  constructor(scope: Construct, id: string, props: AgentSchedulerProps) {
    super(scope, id);

    // Dispatcher Lambda — invoked per (repo × jobType)
    this.dispatcherFunction = new nodejs.NodejsFunction(this, 'Dispatcher', {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'handler',
      entry: path.join(__dirname, 'handlers/invoke-agent.ts'),
      timeout: cdk.Duration.minutes(15),
      memorySize: 256,
      environment: {
        AGENT_RUNTIME_ARN: props.agentRuntime.agentRuntimeArn,
        REPOS_TABLE_NAME: props.reposTableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // Grant AgentCore invocation
    this.dispatcherFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock-agentcore:InvokeAgentRuntime'],
        resources: [
          props.agentRuntime.agentRuntimeArn,
          `${props.agentRuntime.agentRuntimeArn}/*`,
        ],
      }),
    );

    // Scheduler execution role — used by dynamically created EventBridge Schedules
    this.schedulerRole = new iam.Role(this, 'SchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
    });
    this.dispatcherFunction.grantInvoke(this.schedulerRole);
  }
}
