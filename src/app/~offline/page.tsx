import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Sem conexão" };

export default function SemConexao() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ display: "grid", gap: 14, justifyItems: "center", maxWidth: 360 }}>
        <Logo tamanho={48} />
        <h1 style={{ fontSize: 24 }}>Sem conexão</h1>
        <p style={{ color: "var(--text-2)" }}>
          Esta tela ainda não foi salva no aparelho. Abra Hoje ou Agenda, que ficam disponíveis
          offline, ou tente de novo quando a internet voltar.
        </p>
        {/* Navegação completa de propósito: o service worker serve a versão salva. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" style={{ fontWeight: 600 }}>
          Ir para Hoje
        </a>
      </div>
    </main>
  );
}
