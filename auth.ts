import type { NextAuthOptions } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { auditAuthSignIn, auditAuthSignOut } from "@/server/audit/auth-audit-events";

import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/drizzle/schema";

import { controlDb } from "@/server/db/control-db";
import { env } from "@/shared/config/env";

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(controlDb, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),

  secret: env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV !== "production",

  pages: {
    signIn: "/login",
    signOut: "/logout",
    verifyRequest: "/verify-request",
  },

  session: {
    strategy: "database",
  },

  providers: [
    EmailProvider({
      server: {
        host: env.EMAIL_SERVER_HOST,
        port: env.EMAIL_SERVER_PORT,
        secure: env.EMAIL_SERVER_PORT === 465,
        auth:
          env.EMAIL_SERVER_USER && env.EMAIL_SERVER_PASSWORD
            ? {
              user: env.EMAIL_SERVER_USER,
              pass: env.EMAIL_SERVER_PASSWORD,
            }
            : undefined,
      },
      from: env.EMAIL_FROM,
    }),

    ...(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
      ? [
        GoogleProvider({
          clientId: env.AUTH_GOOGLE_ID,
          clientSecret: env.AUTH_GOOGLE_SECRET,
        }),
      ]
      : []),

    ...(env.AUTH_MICROSOFT_ENTRA_ID_ID &&
      env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
      env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID
      ? [
        AzureADProvider({
          clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID,
          clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
          tenantId: env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID,
        }),
      ]
      : []),
  ],

  callbacks: {
    async session({ session, user }) {
      if (session.user && user?.id) {
        session.user.id = user.id;
      }

      return session;
    },
  },

  events: {
    async signIn(message) {
      await auditAuthSignIn({
        userId: message.user.id,
        email: message.user.email,
        provider: message.account?.provider ?? "email",
        isNewUser: message.isNewUser,
      });
    },

    async signOut(message) {
      const userId = message.session?.user?.id ?? null;

      await auditAuthSignOut({
        userId,
      });
    },

  },
};