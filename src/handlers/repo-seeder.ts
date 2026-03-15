/**
 * Custom Resource Lambda: Register/delete a repository via Registry Lambda.
 * Resolves GitHub App installation ID automatically from Secrets Manager.
 */
import * as crypto from 'crypto';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const lambdaClient = new LambdaClient({});
const secretsClient = new SecretsManagerClient({});

const REGISTRY_FUNCTION_NAME = process.env.REGISTRY_FUNCTION_NAME!;
const GITHUB_APP_SECRET_NAME = process.env.GITHUB_APP_SECRET_NAME!;

interface CloudFormationEvent {
  RequestType: 'Create' | 'Update' | 'Delete';
  ResourceProperties: {
    Owner: string;
    Repo: string;
    Jobs: string;
    ModelId?: string;
  };
}

function generateJwt(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ iat: now - 60, exp: now + 300, iss: appId }),
  ).toString('base64url');
  const signature = crypto
    .sign('sha256', Buffer.from(`${header}.${payload}`), {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    })
    .toString('base64url');
  return `${header}.${payload}.${signature}`;
}

async function getInstallationId(
  appId: string,
  privateKey: string,
  owner: string,
  repo: string,
): Promise<number> {
  const jwt = generateJwt(appId, privateKey);
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/installation`,
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'repo-patrol',
      },
    },
  );
  if (!res.ok) {
    throw new Error(
      `Failed to get installation for ${owner}/${repo}: ${res.status} ${await res.text()}`,
    );
  }
  const data = (await res.json()) as { id: number };
  return data.id;
}

async function invokeRegistry(event: {
  httpMethod: string;
  path: string;
  body?: string;
  pathParameters?: Record<string, string>;
}): Promise<{ statusCode: number; body: string }> {
  const result = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: REGISTRY_FUNCTION_NAME,
      Payload: Buffer.from(JSON.stringify(event)),
    }),
  );
  return JSON.parse(Buffer.from(result.Payload!).toString());
}

export const handler = async (event: CloudFormationEvent) => {
  console.log('Repo seeder event:', event.RequestType);

  const {
    Owner: owner,
    Repo: repo,
    Jobs: jobsJson,
    ModelId: modelId,
  } = event.ResourceProperties;
  const repoId = `${owner}#${repo}`;

  if (event.RequestType === 'Delete') {
    const result = await invokeRegistry({
      httpMethod: 'DELETE',
      path: `/repos/${repoId}`,
      pathParameters: { repoId },
    });
    console.log(`Deleted repo ${repoId}:`, result);
    return { Status: 'SUCCESS' };
  }

  // Resolve installation ID from GitHub API
  const secretValue = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: GITHUB_APP_SECRET_NAME }),
  );
  const secret = JSON.parse(secretValue.SecretString!) as {
    app_id: string;
    private_key: string;
  };
  const installationId = await getInstallationId(
    secret.app_id,
    secret.private_key,
    owner,
    repo,
  );
  console.log(
    `Resolved installation ID for ${owner}/${repo}: ${installationId}`,
  );

  const jobs = JSON.parse(jobsJson);

  if (event.RequestType === 'Create') {
    const result = await invokeRegistry({
      httpMethod: 'POST',
      path: '/repos',
      body: JSON.stringify({
        owner,
        repo,
        github_app_installation_id: installationId,
        jobs,
        model_id: modelId || '',
      }),
    });
    console.log(`Created repo ${repoId}:`, result);
  } else {
    // Update
    const result = await invokeRegistry({
      httpMethod: 'PUT',
      path: `/repos/${repoId}`,
      pathParameters: { repoId },
      body: JSON.stringify({
        jobs,
        model_id: modelId || '',
        github_app_installation_id: installationId,
      }),
    });
    console.log(`Updated repo ${repoId}:`, result);
  }

  return { Status: 'SUCCESS' };
};
