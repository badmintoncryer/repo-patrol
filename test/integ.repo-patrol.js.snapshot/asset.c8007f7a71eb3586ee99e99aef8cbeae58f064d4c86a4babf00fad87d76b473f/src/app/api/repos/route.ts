import { NextRequest, NextResponse } from "next/server";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { getSession } from "@/lib/auth";
import { resolveInstallationId } from "@/lib/github-app";

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.REPOS_TABLE_NAME!;

async function requireAuth() {
  try {
    await getSession();
    return null;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  const repoId = request.nextUrl.searchParams.get("repoId");

  if (repoId) {
    const result = await client.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({ repo_id: repoId }),
      })
    );
    if (!result.Item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(unmarshall(result.Item));
  }

  const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
  const items = (result.Items || []).map((item) => unmarshall(item));
  return NextResponse.json({ repos: items });
}

export async function POST(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const body = await request.json();
  const { owner, repo, github_app_installation_id, jobs, model_id } = body;

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner and repo are required" },
      { status: 400 }
    );
  }

  let installationId: number;
  if (github_app_installation_id) {
    installationId = github_app_installation_id;
  } else {
    try {
      installationId = await resolveInstallationId(owner);
    } catch (error) {
      return NextResponse.json(
        {
          error: `Failed to resolve installation ID: ${(error as Error).message}`,
        },
        { status: 422 }
      );
    }
  }

  const now = new Date().toISOString();
  const item = {
    repo_id: `${owner}#${repo}`,
    owner,
    repo,
    enabled: true,
    github_app_installation_id: installationId,
    model_id: model_id || "",
    jobs: jobs || {},
    created_at: now,
    updated_at: now,
  };

  await client.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(item, { removeUndefinedValues: true }),
    })
  );

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const repoId = request.nextUrl.searchParams.get("repoId");
  if (!repoId) {
    return NextResponse.json({ error: "repoId required" }, { status: 400 });
  }

  const body = await request.json();
  const now = new Date().toISOString();

  const updateExpressions: string[] = ["#updated_at = :updated_at"];
  const expressionNames: Record<string, string> = { "#updated_at": "updated_at" };
  const expressionValues: Record<string, any> = { ":updated_at": { S: now } };

  for (const [key, value] of Object.entries(body)) {
    if (key === "repo_id") continue;
    updateExpressions.push(`#${key} = :${key}`);
    expressionNames[`#${key}`] = key;
    expressionValues[`:${key}`] = marshall(value);
  }

  await client.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ repo_id: repoId }),
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
    })
  );

  return NextResponse.json({ repo_id: repoId, updated_at: now });
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const repoId = request.nextUrl.searchParams.get("repoId");
  if (!repoId) {
    return NextResponse.json({ error: "repoId required" }, { status: 400 });
  }

  await client.send(
    new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ repo_id: repoId }),
    })
  );

  return NextResponse.json({ deleted: repoId });
}
