import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { RepoPatrol } from "./constructs";

export class RepoPatrolStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new RepoPatrol(this, "Patrol", {
      githubAppSecretArn: `arn:aws:secretsmanager:${this.region}:${this.account}:secret:repo-patrol-github-app`,
      modelId: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
      maxToolCalls: 100,
      enableDashboard: true,
      dryRun: false,
    });
  }
}
