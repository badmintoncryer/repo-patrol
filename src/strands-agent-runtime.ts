import * as path from 'path';
import {
  Runtime,
  AgentRuntimeArtifact,
} from '@aws-cdk/aws-bedrock-agentcore-alpha';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface StrandsAgentRuntimeProps {
  readonly reportBucket: s3.IBucket;
  readonly githubAppSecretArn: string;
  readonly reposTableName: string;
  readonly jobHistoryTableName: string;
  readonly processedItemsTableName: string;
  readonly modelId?: string;
  readonly maxToolCalls?: number;
  readonly dryRun?: boolean;
}

export class StrandsAgentRuntime extends Construct {
  public readonly runtime: Runtime;

  constructor(scope: Construct, id: string, props: StrandsAgentRuntimeProps) {
    super(scope, id);

    this.runtime = new Runtime(this, 'Runtime', {
      runtimeName: 'repo_patrol_agent',
      agentRuntimeArtifact: AgentRuntimeArtifact.fromAsset(
        path.join(__dirname, '../agent'),
      ),
      environmentVariables: {
        REPORT_BUCKET_NAME: props.reportBucket.bucketName,
        GITHUB_APP_SECRET_ARN: props.githubAppSecretArn,
        REPOS_TABLE_NAME: props.reposTableName,
        JOB_HISTORY_TABLE_NAME: props.jobHistoryTableName,
        PROCESSED_ITEMS_TABLE_NAME: props.processedItemsTableName,
        MODEL_ID: props.modelId ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
        MAX_TOOL_CALLS: (props.maxToolCalls ?? 100).toString(),
        DRY_RUN: (props.dryRun ?? false).toString(),
      },
    });

    // Bedrock model invocation
    this.runtime.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: ['arn:aws:bedrock:*::foundation-model/*'],
      }),
    );

    // S3 write for reports
    props.reportBucket.grantWrite(this.runtime);

    // Secrets Manager read for GitHub App credentials
    this.runtime.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [props.githubAppSecretArn],
      }),
    );

    // DynamoDB access for job history and processed items
    this.runtime.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'dynamodb:PutItem',
          'dynamodb:GetItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        resources: ['*'], // Scoped by table name in agent config
      }),
    );
  }
}
