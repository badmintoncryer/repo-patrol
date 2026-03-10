import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const BUCKET = process.env.REPORT_BUCKET_NAME!;

export async function GET(request: NextRequest) {
  const owner = request.nextUrl.searchParams.get("owner");
  const repo = request.nextUrl.searchParams.get("repo");
  const key = request.nextUrl.searchParams.get("key");

  // Get specific report by S3 key
  if (key) {
    try {
      const result = await s3.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: key })
      );
      const body = await result.Body?.transformToString();
      return NextResponse.json(JSON.parse(body || "{}"));
    } catch (error) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }
  }

  // List reports for a repo
  const prefix = owner && repo ? `reports/${owner}/${repo}/` : "reports/";

  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: 50,
    })
  );

  const reports = (result.Contents || [])
    .sort(
      (a, b) =>
        (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
    )
    .map((obj) => ({
      key: obj.Key,
      lastModified: obj.LastModified?.toISOString(),
      size: obj.Size,
    }));

  return NextResponse.json({ reports });
}
