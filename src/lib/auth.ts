import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Which social providers are configured (used to render only the usable buttons). */
export const enabledSocialProviders = {
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  "microsoft-entra-id": Boolean(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
  ),
  facebook: Boolean(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET),
};

const providers: NextAuthConfig["providers"] = [];
if (enabledSocialProviders.google) providers.push(Google({ allowDangerousEmailAccountLinking: true }));
if (enabledSocialProviders["microsoft-entra-id"])
  providers.push(MicrosoftEntraID({ allowDangerousEmailAccountLinking: true }));
if (enabledSocialProviders.facebook) providers.push(Facebook({ allowDangerousEmailAccountLinking: true }));

providers.push(
  Credentials({
    id: "credentials",
    name: "Email & password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;
      return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role };
    },
  }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On initial sign-in, or when the client calls `update()`, refresh role from the database.
      if (user || trigger === "update") {
        const id = (user?.id ?? token.id ?? token.sub) as string | undefined;
        if (id) {
          const dbUser = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, email: true } });
          if (dbUser) {
            let role: Role = dbUser.role;
            if (dbUser.email && adminEmails.includes(dbUser.email.toLowerCase()) && role !== "ADMIN") {
              await prisma.user.update({ where: { id }, data: { role: "ADMIN" } });
              role = "ADMIN";
            }
            token.id = dbUser.id;
            token.role = role;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id;
      session.user.role = token.role ?? "CUSTOMER";
      return session;
    },
  },
});

/** Returns the current session or throws (for server actions). */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}
