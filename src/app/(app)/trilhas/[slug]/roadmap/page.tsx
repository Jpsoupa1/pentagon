import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Roadmap } from "@/components/telas/roadmap/Roadmap";
import { ABAS, type Aba } from "@/components/telas/roadmap/comum";
import { NaoEncontrado } from "@/server/erros";
import { exigirUsuario } from "@/server/sessao";
import { obterRoadmap } from "@/server/servicos/roadmap";

export const metadata: Metadata = { title: "Roadmap" };

export default async function PaginaRoadmap({
  params,
  searchParams,
}: PageProps<"/trilhas/[slug]/roadmap">) {
  const usuario = await exigirUsuario();
  const [{ slug }, { aba }] = await Promise.all([params, searchParams]);
  const dados = await obterRoadmap(usuario.id, slug).catch((e) => {
    if (e instanceof NaoEncontrado) notFound();
    throw e;
  });
  const abaInicial: Aba = ABAS.includes(aba as Aba) ? (aba as Aba) : "cursos";
  return <Roadmap key={slug} inicial={dados} abaInicial={abaInicial} />;
}
