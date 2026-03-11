import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export interface RepoRegistryProps {
  /** Fallback schedule expression when no schedule is configured */
  readonly fallbackSchedule: string;
}

export class RepoRegistry extends Construct {
  public readonly reposTable: dynamodb.Table;
  public readonly jobHistoryTable: dynamodb.Table;
  public readonly processedItemsTable: dynamodb.Table;
  public readonly registryFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: RepoRegistryProps) {
    super(scope, id);

    // Repos table
    this.reposTable = new dynamodb.Table(this, 'ReposTable', {
      partitionKey: { name: 'repo_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Job history table
    this.jobHistoryTable = new dynamodb.Table(this, 'JobHistoryTable', {
      partitionKey: { name: 'repo_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'executed_at', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Processed items table
    this.processedItemsTable = new dynamodb.Table(
      this,
      'ProcessedItemsTable',
      {
        partitionKey: { name: 'repo_id', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'item_key', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        timeToLiveAttribute: 'ttl',
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    // Registry API Lambda — manages repos AND their EventBridge Schedules
    this.registryFunction = new nodejs.NodejsFunction(
      this,
      'RegistryApiFunction',
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        handler: 'handler',
        entry: path.join(__dirname, 'handlers/registry-api.ts'),
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        environment: {
          REPOS_TABLE_NAME: this.reposTable.tableName,
          FALLBACK_SCHEDULE: props.fallbackSchedule,
        },
        bundling: {
          minify: true,
          sourceMap: true,
        },
      },
    );

    this.reposTable.grantReadWriteData(this.registryFunction);

    // Grant EventBridge Scheduler management
    this.registryFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'scheduler:CreateSchedule',
          'scheduler:UpdateSchedule',
          'scheduler:DeleteSchedule',
          'scheduler:GetSchedule',
        ],
        resources: ['arn:aws:scheduler:*:*:schedule/default/repo-patrol-*'],
      }),
    );

  }
}
