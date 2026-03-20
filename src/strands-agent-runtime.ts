import * as path from 'path';
import {
  Runtime,
  AgentRuntimeArtifact,
} from '@aws-cdk/aws-bedrock-agentcore-alpha';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface StrandsAgentRuntimeProps {
  readonly reportBucket: s3.IBucket;
  readonly githubAppSecret: secretsmanager.ISecret;
  readonly reposTable: dynamodb.ITable;
  readonly jobHistoryTable: dynamodb.ITable;
  readonly processedItemsTable: dynamodb.ITable;
  readonly modelId?: string;
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
        GITHUB_APP_SECRET_NAME: props.githubAppSecret.secretName,
        REPOS_TABLE_NAME: props.reposTable.tableName,
        JOB_HISTORY_TABLE_NAME: props.jobHistoryTable.tableName,
        PROCESSED_ITEMS_TABLE_NAME: props.processedItemsTable.tableName,
        MODEL_ID: props.modelId ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      },
    });

    // Bedrock model invocation
    this.runtime.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: [
          'arn:aws:bedrock:*::foundation-model/*',
          'arn:aws:bedrock:*:*:inference-profile/*',
        ],
      }),
    );

    // S3 write for reports
    props.reportBucket.grantWrite(this.runtime);

    // Secrets Manager read for GitHub App credentials
    props.githubAppSecret.grantRead(this.runtime);

    // DynamoDB access scoped to specific tables
    props.reposTable.grantReadData(this.runtime);
    props.jobHistoryTable.grantReadWriteData(this.runtime);
    props.processedItemsTable.grantReadWriteData(this.runtime);
  }
}
