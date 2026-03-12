import * as cdk from 'aws-cdk-lib';
import { Duration, TimeZone } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ScheduleExpression } from 'aws-cdk-lib/aws-scheduler';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { JobType, RepoPatrol } from '../src';

function testSecret(stack: cdk.Stack, id = 'TestSecret') {
  return secretsmanager.CfnSecret.fromSecretId(
    stack, id, 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret',
  );
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

test('RepoPatrol with repositories creates seeder custom resource', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  new RepoPatrol(stack, 'TestPatrol', {
    githubAppSecret: testSecret(stack),
    enableDashboard: false,
    repositories: [
      {
        owner: 'my-org',
        repo: 'my-app',
        githubAppInstallationId: 12345,
        jobs: {
          [JobType.REVIEW_PULL_REQUESTS]: {
            schedule: ScheduleExpression.cron({
              hour: '0',
              minute: '0',
              timeZone: TimeZone.ASIA_TOKYO,
            }),
          },
          [JobType.HANDLE_DEPENDABOT]: {
            schedule: ScheduleExpression.rate(Duration.hours(6)),
          },
        },
      },
      {
        owner: 'my-org',
        repo: 'another-repo',
        githubAppInstallationId: 67890,
      },
    ],
  });

  const template = Template.fromStack(stack);

  // Repo seeder custom resource should exist
  template.hasResource('AWS::CloudFormation::CustomResource', {
    Properties: {
      Repositories: Match.stringLikeRegexp('my-org'),
    },
  });

  // 2 repos should be in the seeder payload
  template.hasResource('AWS::CloudFormation::CustomResource', {
    Properties: {
      Repositories: Match.stringLikeRegexp('another-repo'),
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

test('RepoPatrol without per-job schedule uses fallback for all jobs', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  new RepoPatrol(stack, 'TestPatrol', {
    githubAppSecret: testSecret(stack),
    enableDashboard: false,
    repositories: [
      {
        owner: 'my-org',
        repo: 'my-app',
        githubAppInstallationId: 12345,
      },
    ],
  });

  const template = Template.fromStack(stack);

  // All jobs should use the fallback cron schedule (cron(0 0 * * ? *))
  template.hasResource('AWS::CloudFormation::CustomResource', {
    Properties: {
      Repositories: Match.stringLikeRegexp('cron\\(0 0'),
    },
  });

  // No rate() expressions should appear since no per-job schedules are set
  const resources = template.findResources('AWS::CloudFormation::CustomResource');
  for (const [, resource] of Object.entries(resources)) {
    const repos = (resource as any).Properties?.Repositories;
    if (repos && typeof repos === 'string' && repos.includes('my-org')) {
      expect(repos).not.toContain('rate(');
    }
  }
});
