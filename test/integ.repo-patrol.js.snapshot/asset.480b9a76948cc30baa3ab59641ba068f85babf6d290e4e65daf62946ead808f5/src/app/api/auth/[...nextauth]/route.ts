import { handlers } from "@/auth";
import { NextRequest } from "next/server";

// NextAuth uses `new URL(request.url)` to construct form action URLs.
// Behind CloudFront + Lambda, request.url is the internal 0.0.0.0:3000.
// Rewrite the request URL to use x-forwarded-host so NextAuth generates
// correct sign-in/callback URLs pointing to the CloudFront domain.
function withForwardedHost(
  handler: (req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) => {
    const forwardedHost = req.headers.get("x-forwarded-host");
    if (forwardedHost) {
      const proto = req.headers.get("x-forwarded-proto") || "https";
      const url = new URL(req.url);
      const newUrl = `${proto}://${forwardedHost}${url.pathname}${url.search}`;
      const newReq = new NextRequest(newUrl, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
      return handler(newReq, ctx);
    }
    return handler(req, ctx);
  };
}

export const GET = withForwardedHost(handlers.GET);
export const POST = withForwardedHost(handlers.POST);
