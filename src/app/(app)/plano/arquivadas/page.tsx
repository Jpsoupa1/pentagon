import type { Metadata } from "next";
import { SemPlano } from "@/components/telas/plano/SemPlano";
import { BotaoLink } from "@/components/ui/Botao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { CabecalhoPagina } from "@/components/ui/Pagina";
import { exigirUsuario } from "@/server/sessao";
import { estadoDoPlano } from "@/server/servicos/plano";

export const metadata: Metadata = { title: "Trilhas arquivadas" };

/** Lista só de leitura. Nada é arquivado nesta etapa, então ela fica vazia por enquanto. */
export default async function PaginaTrilhasArquivadas() {
  const usuario = await exigirUsuario();
  const { plano } = await estadoDoPlano(usuario.id);
  if (!plano) return <SemPlano />;
  return (
    <>
      <CabecalhoPagina titulo="Trilhas arquivadas" sobre="Plano" />
      <EstadoVazio acao={<BotaoLink href="/plano">Voltar ao plano</BotaoLink>}>
        Nenhuma trilha arquivada.
      </EstadoVazio>
    </>
  );
}
