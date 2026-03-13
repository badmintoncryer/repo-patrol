import crypto from "node:crypto";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const smClient = new SecretsManagerClient({});

let cached: { appId: string; privateKey: string; fetchedAt: number } | null =
  null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getAppCredentials(): Promise<{
  appId: string;
  privateKey: string;
}> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }
  const res = await smClient.send(
    new GetSecretValueCommand({
      SecretId: process.env.GITHUB_APP_SECRET_ARN!,
    })
  );
  const secret = JSON.parse(res.SecretString!);
  cached = {
    appId: secret.app_id,
    privateKey: secret.private_key,
    fetchedAt: Date.now(),
  };
  return cached;
}

function createGitHubAppJwt(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iss: appId, iat: now - 60, exp: now + 600 })
  ).toString("base64url");
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${payload}`)
    .sign(privateKey, "base64url");
  return `${header}.${payload}.${signature}`;
}

export async function resolveInstallationId(owner: string): Promise<number> {
  const { appId, privateKey } = await getAppCredentials();
  const jwt = createGitHubAppJwt(appId, privateKey);

  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/app/installations?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
    }
    const installations = await res.json();
    if (installations.length === 0) break;

    const match = installations.find(
      (inst: any) =>
        inst.account?.login?.toLowerCase() === owner.toLowerCase()
    );
    if (match) return match.id;
    if (installations.length < 100) break;
    page++;
  }

  throw new Error(
    `No GitHub App installation found for owner "${owner}". ` +
      `Ensure the GitHub App is installed on this organization/account.`
  );
}
