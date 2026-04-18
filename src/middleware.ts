import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAppRoute = pathname.startsWith("/app");
  const isDashboard = pathname.startsWith("/dashboard");

  if ((isAppRoute || isDashboard) && !req.auth) {
    const signIn = new URL("/auth/signin", req.url);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }

  if (isAppRoute && req.auth && !req.auth.user?.subscriptionActive) {
    const pricing = new URL("/pricing", req.url);
    pricing.searchParams.set("message", "subscribe");
    return NextResponse.redirect(pricing);
  }
});

export const config = {
  matcher: ["/app/:path*", "/dashboard/:path*"],
};
