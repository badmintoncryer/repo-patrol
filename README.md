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
import { Duration } from 'aws-cdk-lib';
import { ScheduleExpression } from 'aws-cdk-lib/aws-scheduler';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { RepoPatrol, JobType } from 'repo-patrol';

const secret = secretsmanager.Secret.fromSecretNameV2(this, 'Secret', 'repo-patrol/github-app');

new RepoPatrol(this, 'Patrol', {
  githubAppSecret: secret,

  // Optional
  modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  dryRun: false,
  enableDashboard: true,
  mfaRequired: true, // TOTP MFA for dashboard login (default: true)
  adminEmails: ['admin@example.com'],

  // IaC-managed repositories (optional)
  repositories: [
    {
      owner: 'my-org',
      repo: 'my-app',
      jobs: {
        [JobType.REVIEW_PULL_REQUESTS]: {
          schedule: ScheduleExpression.cron({ hour: '1', minute: '0' }),
        },
        [JobType.HANDLE_DEPENDABOT]: {
          schedule: ScheduleExpression.rate(Duration.hours(6)),
        },
        [JobType.REPO_HEALTH_CHECK]: {
          schedule: ScheduleExpression.cron({ minute: '0', hour: '0', weekDay: 'MON' }),
        },
      },
    },
  ],
});
```

### Repository Management

Repositories can be managed in two ways:

**1. IaC-managed (via `repositories` prop)**

Repositories defined in the `repositories` prop are registered automatically at deploy time. A Custom Resource invokes the Registry Lambda to create DynamoDB records and EventBridge schedules. The GitHub App installation ID is resolved automatically.

- **Add**: Include in `repositories` array -> deployed on `cdk deploy`
- **Update**: Change schedule/config in code -> updated on next deploy
- **Remove**: Remove from array -> DynamoDB record + EventBridge schedules are deleted

**2. UI-managed (via Dashboard)**

Repositories can also be registered and configured through the Dashboard UI after deployment. No CDK changes required.

**Mixed mode**: Both approaches coexist independently. IaC-managed and UI-managed repositories do not interfere with each other. However, if a UI-managed repository is later added to the `repositories` prop, the CDK definition becomes the source of truth and UI changes will be overwritten on deploy (drift).

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

| Job | Description |
|---|---|
| `review_pull_requests` | Review open PRs and post comments |
| `triage_issues` | Analyze issues, add labels, post comments |
| `handle_dependabot` | Auto-approve/merge Dependabot PRs |
| `analyze_ci_failures` | Analyze CI failure logs, suggest fixes |
| `check_dependencies` | Check for dependency updates |
| `repo_health_check` | Audit README, LICENSE, CI config |

All jobs default to **daily at UTC 00:00** (`cron(0 0 * * ? *)`). Override per job via the Dashboard UI or Registry API.

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
- Dependabot: auto-merge patch, auto-approve minor, report-only for major
- Bot comments are prefixed with `[repo-patrol]`
- GitHub App uses short-lived installation tokens (1-hour expiry)

## AWS Resources Created

| Resource | Count | Description |
|---|---|---|
| S3 Bucket | 1 | Report storage |
| DynamoDB Tables | 3 | repos, job_history, processed_items |
| Bedrock AgentCore Runtime | 1 | Strands Agent container (ARM64) |
| Lambda Functions | 4 | Dispatcher, Registry API, Schedule Cleanup, Webapp |
| IAM Roles | 1 + per-Lambda | Scheduler execution role + Lambda execution roles |
| EventBridge Schedules | Dynamic | Per repo x jobType (e.g. 5 repos x 6 jobs = 30 schedules) |
| Custom Resources | 1 + per IaC repo | Schedule Cleanup + Repo Seeder per IaC-managed repository |
| Secrets Manager | 0 | Uses existing secret (user-provided ARN) |
| CloudFront Distribution | 0-1 | Dashboard CDN (if `enableDashboard: true`) |
| Cognito User Pool | 0-1 | Dashboard auth with MFA (if `enableDashboard: true`) |

## Cost Estimate

All resources are serverless / pay-per-use. Prices are for **us-east-1** (On-Demand).

### Per-Resource Pricing

| Resource | Pricing Model | Unit Price |
|---|---|---|
| **Bedrock AgentCore Runtime** | vCPU + Memory | $0.0895/vCPU-hour + $0.00945/GB-hour |
| **Bedrock Model** (Haiku 4.5) | Token-based | $0.25/1M input tokens, ~$0.25/1M output tokens |
| **Lambda** (ARM64) | Request + Duration | $0.20/1M requests + $0.0000133334/GB-second |
| **DynamoDB** (On-Demand) | Read/Write units | $0.125/1M RRU + $0.625/1M WRU + $0.25/GB-month storage |
| **S3** (Standard) | Storage + Requests | $0.023/GB-month + $0.005/1K PUT + $0.0004/1K GET |
| **EventBridge Scheduler** | Invocations | First 14M/month free, then $1.00/1M |
| **CloudFront** | Requests + Transfer | $0.01/10K HTTPS requests + 1TB/month free transfer |
| **Cognito** (Advanced Security) | MAU | $0.02/MAU (Plus tier) |
| **Secrets Manager** | Per secret | $0.40/secret/month + $0.05/10K API calls |

### Monthly Cost Estimate

Assumes each job runs ~2 min with 2 vCPU + 4 GB, processing ~15K tokens per run.

| Category | 5 repos (small) | 20 repos (medium) |
|---|---|---|
| **Bedrock AgentCore Runtime** | ~$6.50 | ~$26.00 |
| **Bedrock Model** (Haiku 4.5) | ~$3.50 | ~$14.00 |
| **Lambda** (all functions) | ~$0.10 | ~$0.30 |
| **Secrets Manager** | $0.40 | $0.40 |
| **DynamoDB** | ~$0.01 | ~$0.05 |
| **S3** | ~$0.02 | ~$0.05 |
| **EventBridge Scheduler** | $0.00 | $0.00 |
| **CloudFront + Cognito** | ~$0.15 | ~$0.15 |
| **Total** | **~$10–12/month** | **~$41–47/month** |

> **Cost drivers**: AgentCore Runtime compute and Bedrock model invocations account for ~90% of the cost. Costs scale linearly with the number of repositories and schedule frequency.
>
> **To reduce costs**:
> - Use Haiku 4.5 (default) instead of Sonnet (~12x cheaper per token)
> - Reduce schedule frequency for less critical jobs
> - Set `enableDashboard: false` to eliminate CloudFront + Cognito + Webapp Lambda
> - Reduce the number of enabled job types per repository

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
