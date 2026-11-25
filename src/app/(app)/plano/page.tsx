import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CadernoNoPlano } from "@/components/telas/plano/CadernoNoPlano";
import { Plano } from "@/components/telas/plano/Plano";
import { SemPlano } from "@/components/telas/plano/SemPlano";
import { hojeLocal } from "@/lib/tempo";
import { exigirUsuario } from "@/server/sessao";
import { obterAjustes } from "@/server/servicos/ajustes";
import { estadoDoPlano } from "@/server/servicos/plano";
import { errosVencidos } from "@/server/servicos/revisao";

export const metadata: Metadata = { title: "Plano" };

export default async function PaginaPlano() {
  const usuario = await exigirUsuario();
  const { plano } = await estadoDoPlano(usuario.id);
  if (!plano) return <SemPlano />;
  if (!plano.iniciado) redirect("/plano/inicio");
  const { fuso } = await obterAjustes(usuario.id);
  const hoje = hojeLocal(new Date(), fuso);
  return (
    <>
      <Plano inicial={plano} />
      <CadernoNoPlano erros={await errosVencidos(usuario.id, hoje)} hoje={hoje} />
    </>
  );
}
