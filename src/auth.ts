import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID ?? "common",
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = user.id;
        const result = await pool.query(
          `SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active' AND current_period_end > NOW() LIMIT 1`,
          [user.id]
        );
        token.subscriptionActive = result.rows.length > 0;
      }
      if (trigger === "update") {
        const result = await pool.query(
          `SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active' AND current_period_end > NOW() LIMIT 1`,
          [token.userId]
        );
        token.subscriptionActive = result.rows.length > 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.subscriptionActive = (token.subscriptionActive ?? false) as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
