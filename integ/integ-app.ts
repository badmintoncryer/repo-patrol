import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import { JobType, RepoPatrol } from '../src';

const app = new cdk.App();

const stack = new cdk.Stack(app, 'RepoPatrolIntegStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
});

const githubAppSecretArn = app.node.tryGetContext('githubAppSecretArn');
if (!githubAppSecretArn) {
  throw new Error(
    'Missing context: githubAppSecretArn. Usage: cdk deploy -c githubAppSecretArn=arn:aws:secretsmanager:...',
  );
}

new RepoPatrol(stack, 'Patrol', {
  githubAppSecretArn,
  enableDashboard: true,
  dryRun: true,
  defaultSchedules: {
    [JobType.REVIEW_PULL_REQUESTS]: events.Schedule.rate(cdk.Duration.hours(12)),
    [JobType.TRIAGE_ISSUES]: events.Schedule.rate(cdk.Duration.days(1)),
  },
  repositories: app.node.tryGetContext('repositories')
    ? JSON.parse(app.node.tryGetContext('repositories')).map(
      (repo: string) => ({ repository: repo }),
    )
    : undefined,
});

app.synth();
