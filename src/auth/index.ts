// src/auth/index.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import {
  clearRateLimit,
  consumeRateLimit,
  getRequestIpFromHeaders,
} from "../lib/auth-security";

const DUMMY_PASSWORD_HASH =
  "$2b$12$w4Lr8CJOt7E4ItlgXbTZJ.ObCBdFGNwlpCav3E6jRCC6S7vPtSQF.";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);
        const ip = getRequestIpFromHeaders(request.headers);
        const loginKey = `${ip}:${email}`;

        const [ipLimit, accountLimit] = await Promise.all([
          consumeRateLimit({
            scope: "login-ip",
            identifier: ip,
            limit: 100,
            windowMs: 15 * 60 * 1000,
          }),
          consumeRateLimit({
            scope: "login-account",
            identifier: loginKey,
            limit: 8,
            windowMs: 15 * 60 * 1000,
          }),
        ]);
        if (!ipLimit.allowed || !accountLimit.allowed) return null;

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
          return null;
        }
        const isValid = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!isValid || user.role === "banned") return null;
        await clearRateLimit("login-account", loginKey);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role, // 返回到 token 中
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      } else if (typeof token.id === "string") {
        const currentUser = await db.user.findUnique({
          where: { id: token.id },
          select: { role: true },
        });
        token.role = currentUser?.role ?? "banned";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
