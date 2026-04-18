import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID ?? "common",
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isApp = nextUrl.pathname.startsWith("/app");
      const isDashboard = nextUrl.pathname.startsWith("/dashboard");

      if ((isApp || isDashboard) && !isLoggedIn) {
        const url = new URL("/auth/signin", nextUrl);
        url.searchParams.set("callbackUrl", nextUrl.pathname);
        return Response.redirect(url);
      }

      if (isApp && isLoggedIn && !auth?.user?.subscriptionActive) {
        const url = new URL("/pricing", nextUrl);
        url.searchParams.set("message", "subscribe");
        return Response.redirect(url);
      }

      return true;
    },
  },
};
