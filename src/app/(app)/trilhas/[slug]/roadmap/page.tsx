import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Roadmap } from "@/components/telas/roadmap/Roadmap";
import { NaoEncontrado } from "@/server/erros";
import { exigirUsuario } from "@/server/sessao";
import { obterRoadmap } from "@/server/servicos/roadmap";

export const metadata: Metadata = { title: "Roadmap" };

export default async function PaginaRoadmap({ params }: PageProps<"/trilhas/[slug]/roadmap">) {
  const usuario = await exigirUsuario();
  const { slug } = await params;
  const dados = await obterRoadmap(usuario.id, slug).catch((e) => {
    if (e instanceof NaoEncontrado) notFound();
    throw e;
  });
  return <Roadmap inicial={dados} />;
}
