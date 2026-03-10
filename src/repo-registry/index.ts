import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export interface RepoRegistryProps {
  /** ARN of the Dispatcher Lambda that EventBridge Schedules will target */
  readonly dispatcherFunctionArn: string;
  /** ARN of the IAM Role for EventBridge Scheduler */
  readonly schedulerRoleArn: string;
  /** Default schedule expressions per job type */
  readonly defaultSchedules: { [key: string]: string };
  /** Per-repository schedule expression overrides. Keyed by 'owner/repo'. */
  readonly repositorySchedules?: { [repo: string]: { [key: string]: string } };
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
      tableName: 'repo-patrol-repos',
      partitionKey: { name: 'repo_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Job history table
    this.jobHistoryTable = new dynamodb.Table(this, 'JobHistoryTable', {
      tableName: 'repo-patrol-job-history',
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
        tableName: 'repo-patrol-processed-items',
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
          DISPATCHER_FUNCTION_ARN: props.dispatcherFunctionArn,
          SCHEDULER_ROLE_ARN: props.schedulerRoleArn,
          DEFAULT_SCHEDULES: JSON.stringify(props.defaultSchedules),
          REPOSITORY_SCHEDULES: JSON.stringify(props.repositorySchedules ?? {}),
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

    // Grant PassRole for scheduler role
    this.registryFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [props.schedulerRoleArn],
      }),
    );
  }
}
