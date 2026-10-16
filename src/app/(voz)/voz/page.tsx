import type { Metadata, Viewport } from "next";
import { ModoVoz } from "@/components/voz/ModoVoz";
import type { ExecucaoVisivel } from "@/lib/assistente";
import { visaoDaExecucao } from "@/server/assistente/visao";
import { NaoEncontrado } from "@/server/erros";
import { exigirUsuario } from "@/server/sessao";
import { obterAjustes } from "@/server/servicos/ajustes";

export const metadata: Metadata = { title: "Assistente" };
export const viewport: Viewport = { themeColor: "#0F1115" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Modo voz. Abre direto no "Pronto para ouvir". O atalho do iPhone manda `?texto=` com o que foi
 * ditado; `?execucao=` reabre um resultado (recarregar não refaz o pedido).
 */
export default async function Voz({ searchParams }: PageProps<"/voz">) {
  const usuario = await exigirUsuario();
  const { texto, execucao } = await searchParams;
  const { fuso } = await obterAjustes(usuario.id);
  let inicial: ExecucaoVisivel | null = null;
  if (typeof execucao === "string" && UUID.test(execucao)) {
    inicial = await visaoDaExecucao(usuario.id, execucao).catch((e) => {
      if (e instanceof NaoEncontrado) return null;
      throw e;
    });
  }
  return (
    <ModoVoz
      fuso={fuso}
      textoInicial={typeof texto === "string" && texto.trim() ? texto.slice(0, 500) : null}
      execucaoInicial={inicial}
    />
  );
}
