import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "./db";
import { accounts, sessions, users } from "./db/schema";
import { emailPermitido } from "./permissao";

declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  }
}

// Configuração preguiçosa: o adaptador só abre o banco quando há requisição.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(db(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
  }),
  providers: [GitHub],
  session: { strategy: "database", maxAge: 60 * 60 * 24 * 90 },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  callbacks: {
    signIn({ user, profile }) {
      return emailPermitido(user.email ?? profile?.email);
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
}));
