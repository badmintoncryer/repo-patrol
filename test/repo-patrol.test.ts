import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { RepoPatrol } from '../src';

function testSecret(stack: cdk.Stack, id = 'TestSecret') {
  return secretsmanager.Secret.fromSecretNameV2(stack, id, 'test-secret');
}

test('RepoPatrol creates expected resources', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  const secret = testSecret(stack);
  new RepoPatrol(stack, 'TestPatrol', {
    githubAppSecret: secret,
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
    KeySchema: [{ AttributeName: 'repo_id', KeyType: 'HASH' }],
  });

  // DynamoDB job history table
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true },
  });

  // DynamoDB processed items table
  template.resourceCountIs('AWS::DynamoDB::Table', 3);

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

test('RepoPatrol uses daily UTC 00:00 as fallback schedule', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  new RepoPatrol(stack, 'TestPatrol', {
    githubAppSecret: testSecret(stack),
    enableDashboard: false,
  });

  const template = Template.fromStack(stack);

  // Registry API Lambda should have the fallback schedule in FALLBACK_SCHEDULE env var
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        FALLBACK_SCHEDULE: Match.stringLikeRegexp('cron'),
      },
    },
  });
});

