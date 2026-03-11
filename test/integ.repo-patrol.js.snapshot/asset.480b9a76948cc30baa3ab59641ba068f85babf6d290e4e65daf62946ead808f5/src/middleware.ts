import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    // Behind CloudFront + Lambda, req.url uses the internal host (0.0.0.0:3000).
    // Use x-forwarded-host to construct the real external URL.
    const forwardedHost = req.headers.get("x-forwarded-host");
    const baseUrl = forwardedHost
      ? `https://${forwardedHost}`
      : req.nextUrl.origin;
    const callbackUrl = `${baseUrl}${req.nextUrl.pathname}${req.nextUrl.search}`;
    const signInUrl = new URL("/api/auth/signin", baseUrl);
    signInUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
