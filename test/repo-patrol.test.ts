import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as events from 'aws-cdk-lib/aws-events';
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

test('RepoPatrol accepts repositories with Schedule class', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  new RepoPatrol(stack, 'TestPatrol', {
    githubAppSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret',
    enableDashboard: false,
    defaultSchedules: {
      review_pull_requests: events.Schedule.rate(cdk.Duration.hours(12)),
    },
    repositories: [
      {
        repository: 'myorg/repo-a',
        schedules: {
          review_pull_requests: events.Schedule.cron({ hour: '3', minute: '0' }),
          triage_issues: events.Schedule.rate(cdk.Duration.hours(8)),
        },
      },
      {
        repository: 'myorg/repo-b',
      },
    ],
  });

  const template = Template.fromStack(stack);

  // Verify the registry Lambda has the REPOSITORY_SCHEDULES environment variable
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        REPOSITORY_SCHEDULES: JSON.stringify({
          'myorg/repo-a': {
            review_pull_requests: 'cron(0 3 * * ? *)',
            triage_issues: 'rate(8 hours)',
          },
        }),
      },
    },
  });
});
