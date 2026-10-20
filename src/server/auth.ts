import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "./db";
import { accounts, sessions, users } from "./db/schema";
import { semearTrilha } from "./estudos/seed";
import { semearSeguranca } from "./estudos/seguranca";
import { emailPermitido, recebeConteudoPessoal } from "./permissao";
import { semearRotina } from "./rotina/seed";

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
  events: {
    // Primeiro login do dono: grava a trilha DevOps, a rotina pessoal e a trilha de Segurança.
    // Os outros usuários (fora de OWNER_EMAILS) começam com o app vazio.
    async createUser({ user }) {
      if (!user.id || !recebeConteudoPessoal(user.email)) return;
      await semearTrilha(db(), user.id);
      await semearRotina(db(), user.id);
      await semearSeguranca(db(), user.id);
    },
  },
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
