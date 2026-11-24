import type { Metadata } from "next";
import { SemPlano } from "@/components/telas/plano/SemPlano";
import { BotaoLink } from "@/components/ui/Botao";
import { Cartao } from "@/components/ui/Cartao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { CabecalhoPagina, layout } from "@/components/ui/Pagina";
import { exigirUsuario } from "@/server/sessao";
import { listarArquivadas } from "@/server/servicos/arquivadas";
import { estadoDoPlano } from "@/server/servicos/plano";
import s from "@/components/telas/plano/Arquivadas.module.css";

export const metadata: Metadata = { title: "Trilhas arquivadas" };

/** Lista só de leitura: o que o plano tirou de circulação. Nada aqui reativa. */
export default async function PaginaTrilhasArquivadas() {
  const usuario = await exigirUsuario();
  const { plano } = await estadoDoPlano(usuario.id);
  if (!plano) return <SemPlano />;
  const itens = await listarArquivadas(usuario.id);
  return (
    <>
      <CabecalhoPagina titulo="Trilhas arquivadas" sobre="Plano" />
      {itens.length ? (
        <Cartao aria-label="Itens arquivados">
          <ul className={layout.lista}>
            {itens.map((i) => (
              <li key={i.id} className={s.linha}>
                <span className={layout.itemTexto}>
                  <span className={layout.itemTitulo}>{i.nome}</span>
                  <span className={`${layout.meta} mono`}>arquivado em {i.arquivadoEm}</span>
                </span>
              </li>
            ))}
          </ul>
        </Cartao>
      ) : (
        <EstadoVazio acao={<BotaoLink href="/plano">Voltar ao plano</BotaoLink>}>
          Nenhuma trilha arquivada.
        </EstadoVazio>
      )}
    </>
  );
}
