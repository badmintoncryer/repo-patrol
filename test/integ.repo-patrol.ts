import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { App, Stack } from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { RepoPatrol } from '../src';

const app = new App();

class TestStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT ?? '123456789012',
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
      },
    });

    new RepoPatrol(this, 'Patrol', {
      githubAppSecret: secretsmanager.Secret.fromSecretNameV2(
        this, 'GhSecret', 'repo-patrol/github-app',
      ),
      enableDashboard: true,
      adminEmails: ['malaysia.cryer@gmail.com'],
    });
  }
}

const stack = new TestStack(app, 'RepoPatrolTestStack');

new IntegTest(app, 'RepoPatrolIntegTest', {
  testCases: [stack],
});
