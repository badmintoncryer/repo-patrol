import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return NextResponse.json({
    url: req.url,
    headers,
  });
}
