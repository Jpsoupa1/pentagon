import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Plano } from "@/components/telas/plano/Plano";
import { SemPlano } from "@/components/telas/plano/SemPlano";
import { exigirUsuario } from "@/server/sessao";
import { estadoDoPlano } from "@/server/servicos/plano";

export const metadata: Metadata = { title: "Plano" };

export default async function PaginaPlano() {
  const usuario = await exigirUsuario();
  const { plano } = await estadoDoPlano(usuario.id);
  if (!plano) return <SemPlano />;
  if (!plano.iniciado) redirect("/plano/inicio");
  return <Plano inicial={plano} />;
}
