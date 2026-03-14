import { NextRequest, NextResponse } from "next/server";
import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import {
  LambdaClient,
  InvokeCommand,
} from "@aws-sdk/client-lambda";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { getSession } from "@/lib/auth";
import { resolveInstallationId } from "@/lib/github-app";

const dynamoClient = new DynamoDBClient({});
const lambdaClient = new LambdaClient({});
const TABLE_NAME = process.env.REPOS_TABLE_NAME!;
const REGISTRY_FUNCTION_NAME = process.env.REGISTRY_FUNCTION_NAME!;

async function requireAuth() {
  try {
    await getSession();
    return null;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * Invoke the Registry Lambda with an APIGatewayEvent-shaped payload.
 * Returns the parsed response body and status code.
 */
async function invokeRegistry(event: {
  httpMethod: string;
  path: string;
  body?: string;
  pathParameters?: Record<string, string>;
}): Promise<{ statusCode: number; body: any }> {
  const result = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: REGISTRY_FUNCTION_NAME,
      Payload: Buffer.from(JSON.stringify(event)),
    })
  );

  const payload = JSON.parse(
    Buffer.from(result.Payload!).toString()
  );

  return {
    statusCode: payload.statusCode,
    body: JSON.parse(payload.body),
  };
}

export async function GET(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  const repoId = request.nextUrl.searchParams.get("repoId");

  if (repoId) {
    const result = await dynamoClient.send(
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

  const result = await dynamoClient.send(new ScanCommand({ TableName: TABLE_NAME }));
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

  const { statusCode, body: responseBody } = await invokeRegistry({
    httpMethod: "POST",
    path: "/repos",
    body: JSON.stringify({
      owner,
      repo,
      github_app_installation_id: installationId,
      jobs: jobs || {},
      model_id: model_id || "",
    }),
  });

  return NextResponse.json(responseBody, { status: statusCode });
}

export async function PUT(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const repoId = request.nextUrl.searchParams.get("repoId");
  if (!repoId) {
    return NextResponse.json({ error: "repoId required" }, { status: 400 });
  }

  const body = await request.json();

  const { statusCode, body: responseBody } = await invokeRegistry({
    httpMethod: "PUT",
    path: `/repos/${encodeURIComponent(repoId)}`,
    body: JSON.stringify(body),
    pathParameters: { repoId },
  });

  return NextResponse.json(responseBody, { status: statusCode });
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const repoId = request.nextUrl.searchParams.get("repoId");
  if (!repoId) {
    return NextResponse.json({ error: "repoId required" }, { status: 400 });
  }

  const { statusCode, body: responseBody } = await invokeRegistry({
    httpMethod: "DELETE",
    path: `/repos/${encodeURIComponent(repoId)}`,
    pathParameters: { repoId },
  });

  return NextResponse.json(responseBody, { status: statusCode });
}
