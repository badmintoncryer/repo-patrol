import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { RepoPatrol } from '../src';

test('RepoPatrol creates expected resources', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  new RepoPatrol(stack, 'TestPatrol', {
    githubAppSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret',
    enableDashboard: false,
  });

  const template = Template.fromStack(stack);

  // S3 report bucket
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });

  // DynamoDB repos table
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    TableName: 'repo-patrol-repos',
    KeySchema: [{ AttributeName: 'repo_id', KeyType: 'HASH' }],
  });

  // DynamoDB job history table
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    TableName: 'repo-patrol-job-history',
    TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true },
  });

  // DynamoDB processed items table
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    TableName: 'repo-patrol-processed-items',
  });

  // Scheduler IAM Role
  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: { Service: 'scheduler.amazonaws.com' },
        },
      ],
    },
  });
});
