import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PrimeiraAbertura } from "@/components/telas/plano/PrimeiraAbertura";
import { SemPlano } from "@/components/telas/plano/SemPlano";
import { exigirUsuario } from "@/server/sessao";
import { estadoDoPlano } from "@/server/servicos/plano";

export const metadata: Metadata = { title: "Comece o plano" };

export default async function PaginaInicioDoPlano() {
  const usuario = await exigirUsuario();
  const { plano } = await estadoDoPlano(usuario.id);
  if (!plano) return <SemPlano />;
  // Depois de salva, a primeira abertura não volta.
  if (plano.iniciado) redirect("/plano");
  return <PrimeiraAbertura inicial={plano} />;
}
