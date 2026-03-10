import * as path from "path";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import { Runtime } from "@aws-cdk/aws-bedrock-agentcore-alpha";

export type JobType =
  | "review_pull_requests"
  | "triage_issues"
  | "handle_dependabot"
  | "analyze_ci_failures"
  | "check_dependencies"
  | "repo_health_check";

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
    this.dispatcherFunction = new nodejs.NodejsFunction(this, "Dispatcher", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "handler",
      entry: path.join(__dirname, "handlers/invoke-agent.ts"),
      timeout: cdk.Duration.minutes(15),
      memorySize: 256,
      environment: {
        AGENT_RUNTIME_ARN: props.agentRuntime.runtimeArn,
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
        actions: ["bedrock-agentcore:InvokeAgentRuntime"],
        resources: [
          props.agentRuntime.runtimeArn,
          `${props.agentRuntime.runtimeArn}/*`,
        ],
      })
    );

    // Scheduler execution role — used by dynamically created EventBridge Schedules
    this.schedulerRole = new iam.Role(this, "SchedulerRole", {
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
    });
    this.dispatcherFunction.grantInvoke(this.schedulerRole);
  }
}
