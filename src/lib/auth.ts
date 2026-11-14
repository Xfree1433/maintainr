import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";
import { clientIp, loginLimiter } from "@/lib/login-rate-limit";
import { captureServer } from "@/lib/posthog";
import { report as storeReport } from "@/lib/store-activity";
import {
  chooseActiveMembership,
  signInBlockedByBillingLock,
} from "@/lib/billing-lock";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Brute-force limit: refuse before touching the password once this
        // IP+email or IP is over its failure budget (lib/login-rate-limit).
        const ip = clientIp(request?.headers);
        const email = parsed.data.email;
        if (!loginLimiter.attempt(ip, email)) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.hashedPassword) return null;

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.hashedPassword
        );

        if (!isValid) return null;
        loginLimiter.succeeded(ip, email);

        // Billing lock (store plan route, 2026-11-14): a user whose
        // organizations are ALL locked gets the normal "invalid" error rather
        // than a session with no organization. No memberships at all: as before.
        const memberships = await prisma.membership.findMany({
          where: { userId: user.id },
          select: { organization: { select: { billingLockedAt: true } } },
        });
        if (signInBlockedByBillingLock(memberships)) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      // Re-read on every request. Billing-locked organizations are skipped
      // (lib/billing-lock): a member of a locked org loses it on their next
      // request; a member of another, unlocked org keeps that one.
      if (token.id) {
        const memberships = await prisma.membership.findMany({
          where: { userId: token.id as string },
          include: { organization: { select: { name: true, billingLockedAt: true } } },
          orderBy: { createdAt: "desc" },
        });
        const membership = chooseActiveMembership(memberships);
        if (membership) {
          token.organizationId = membership.organizationId;
          token.organizationName = membership.organization.name;
          token.role = membership.role;
        } else {
          // Membership gone: drop the stale org claim instead of keeping it.
          delete token.organizationId;
          delete token.organizationName;
          delete token.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // No org => no user id. Every API route gates on session.user.id, and
        // Prisma drops `organizationId: undefined` from where-filters (matching
        // every tenant), so an org-less session must never look authenticated.
        if (token.organizationId) {
          session.user.id = token.id as string;
        }
        (session as any).organizationId = token.organizationId as string;
        (session as any).organizationName = token.organizationName as string;
        (session as any).role = token.role as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user?.email) {
        await captureServer("app_login", user.email, {});
        void storeReport(user.email, "login"); // store lifecycle: last_login_at
      }
    },
  },
});
