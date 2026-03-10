# repo-patrol

AI-powered OSS repository maintenance patrol agent as an AWS CDK L3 Construct.

Automates routine repository maintenance tasks — PR review, issue triage, Dependabot handling, CI failure analysis, dependency checks, and health monitoring — using [Strands Agents](https://github.com/strands-agents/strands-agents-python) on [Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/).

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ RepoPatrol (CDK L3 Construct)                                    │
│                                                                  │
│  CloudFront ──── Next.js Lambda (Dashboard)                      │
│                    │  next-auth + Cognito                         │
│                    ↕              ↕                               │
│              S3 (reports)   DynamoDB                              │
│                    ↑         ├─ repos (repository config)         │
│                    │         ├─ job_history (execution logs)      │
│                    │         └─ processed_items (idempotency)     │
│                    │                                             │
│  EventBridge Scheduler ──── Dispatcher Lambda                    │
│  (per repo × jobType)        ↕                                   │
│                         Bedrock AgentCore Runtime                │
│                         (Docker / Python / Strands)              │
│                              ↕                                   │
│                         GitHub API (GitHub App auth)              │
│                                                                  │
│  Cognito User Pool (user management)                             │
│  Secrets Manager (GitHub App credentials)                        │
└──────────────────────────────────────────────────────────────────┘
```

## Install

```bash
npm install repo-patrol
# or
pnpm add repo-patrol
```

Peer dependencies:

```bash
npm install aws-cdk-lib constructs @aws-cdk/aws-bedrock-agentcore-alpha
```

## Usage

```typescript
import { RepoPatrol, JobType } from 'repo-patrol';

new RepoPatrol(this, 'Patrol', {
  githubAppSecretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:github-app',

  // Optional
  modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  maxToolCalls: 100,
  dryRun: false,
  enableDashboard: true,

  defaultSchedules: {
    [JobType.REVIEW_PULL_REQUESTS]: 'cron(0 0 * * ? *)',   // Daily UTC 0:00
    [JobType.TRIAGE_ISSUES]:        'cron(0 0 * * ? *)',
    [JobType.HANDLE_DEPENDABOT]:    'rate(6 hours)',
    [JobType.ANALYZE_CI_FAILURES]:  'rate(3 hours)',
    [JobType.CHECK_DEPENDENCIES]:   'cron(0 0 ? * MON *)', // Weekly Monday
    [JobType.REPO_HEALTH_CHECK]:    'cron(0 0 ? * MON *)',
  },
});
```

## Prerequisites

### GitHub App

Create a [GitHub App](https://docs.github.com/en/apps/creating-github-apps) with the following permissions:

| Permission | Access | Purpose |
|---|---|---|
| Pull requests | Read & Write | Review, comment, approve, merge |
| Issues | Read & Write | Triage, label, comment |
| Contents | Read | Read repository files |
| Checks / Commit statuses | Read | CI failure analysis |

Store the credentials in AWS Secrets Manager:

```json
{
  "app_id": "123456",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n..."
}
```

### Amazon Bedrock

Enable the desired foundation model (default: `us.anthropic.claude-haiku-4-5-20251001-v1:0`) in your AWS account via the [Bedrock console](https://console.aws.amazon.com/bedrock/).

## Job Types

| Job | Default Schedule | Description |
|---|---|---|
| `review_pull_requests` | Daily | Review open PRs and post comments |
| `triage_issues` | Daily | Analyze issues, add labels, post comments |
| `handle_dependabot` | Every 6 hours | Auto-approve/merge Dependabot PRs |
| `analyze_ci_failures` | Every 3 hours | Analyze CI failure logs, suggest fixes |
| `check_dependencies` | Weekly (Monday) | Check for dependency updates |
| `repo_health_check` | Weekly (Monday) | Audit README, LICENSE, CI config |

Schedules are configured **per repository x job type** via the Registry API. Default schedules can be overridden at the construct level or per-repository in DynamoDB.

## How It Works

1. **Register repositories** via the Registry API (or Dashboard UI)
2. **EventBridge Scheduler** creates independent schedules per (repo x jobType)
3. **Dispatcher Lambda** receives the schedule event and invokes the Bedrock AgentCore Runtime
4. **Strands Agent** executes the job using 25 tools (GitHub API, CI analysis, dependency checks, etc.)
5. **Reports** are saved to S3 and execution history to DynamoDB
6. **Dashboard** displays repository status, job history, and reports

### Idempotency

Each PR/Issue is processed only once per job run. The `processed_items` DynamoDB table tracks what has been handled, with a 30-day TTL for automatic cleanup.

### Drift Protection

Dynamic EventBridge Schedules are managed outside CloudFormation. To prevent orphaned resources:

- **Stack deletion**: A Custom Resource automatically deletes all `repo-patrol-*` schedules
- **Partial failure (POST)**: If schedule creation fails, the DynamoDB entry is rolled back
- **Partial failure (PUT)**: Returns a warning; retry the update to re-sync
- **Manual repair**: `POST /repos/sync` re-syncs all schedules from DynamoDB state

## Dashboard

When `enableDashboard: true` (default), the construct deploys:

- **Cognito User Pool** for authentication (self-signup disabled)
- **Next.js 15** app on Lambda (ARM64, Docker) via CloudFront
- Repository management UI (register, configure, delete)
- Job status monitoring and report viewing

## Safety

- `dryRun: true` disables all GitHub write operations
- `maxToolCalls: 100` prevents agent infinite loops
- Dependabot: auto-merge patch, auto-approve minor, report-only for major
- Bot comments are prefixed with `[repo-patrol]`
- GitHub App uses short-lived installation tokens (1-hour expiry)

## AWS Resources Created

| Resource | Description |
|---|---|
| S3 Bucket | Report storage |
| DynamoDB Tables (x3) | repos, job_history, processed_items |
| Bedrock AgentCore Runtime | Strands Agent container (ARM64) |
| Lambda Functions (x3) | Dispatcher, Registry API, Schedule Cleanup |
| IAM Roles | Scheduler execution, Lambda execution, AgentCore execution |
| EventBridge Schedules | Dynamic, per repo x jobType |
| Custom Resource | Schedule cleanup on stack deletion |
| CloudFront Distribution | Dashboard CDN (if enabled) |
| Cognito User Pool | Dashboard auth (if enabled) |

## API Reference

See [API.md](./API.md) for the full construct API documentation.

## Development

```bash
# Install dependencies
pnpm install

# Build (jsii compile + test + lint + package)
pnpm exec projen build

# Run tests only
pnpm exec projen test

# Synthesize projen config
pnpm exec projen
```

## License

Apache-2.0
