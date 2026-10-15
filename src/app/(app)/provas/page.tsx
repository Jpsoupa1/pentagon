import type { Metadata } from "next";
import Link from "next/link";
import { Checklist, ConcluirAvaliacao } from "@/components/telas/Acoes";
import { Cartao, CartaoCabeca, Rotulo } from "@/components/ui/Cartao";
import { ChipArea } from "@/components/ui/ChipArea";
import { Contagem } from "@/components/ui/Contagem";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { CabecalhoPagina, layout } from "@/components/ui/Pagina";
import { contagemRegressiva } from "@/lib/contagem";
import { TIPO_AVALIACAO_NOME } from "@/lib/dominio";
import { dataCurta, dataLonga, duracaoTexto, horaLocal, partesLocais } from "@/lib/tempo";
import { idSchema } from "@/server/api";
import { exigirUsuario } from "@/server/sessao";
import { obterAjustes } from "@/server/servicos/ajustes";
import {
  listarAvaliacoes,
  obterAvaliacao,
  type AvaliacaoLista,
} from "@/server/servicos/avaliacoes";

export const metadata: Metadata = { title: "Provas e entregas" };

export default async function Provas({ searchParams }: PageProps<"/provas">) {
  const usuario = await exigirUsuario();
  const { fuso } = await obterAjustes(usuario.id);
  const todas = await listarAvaliacoes(usuario.id);
  const { item } = await searchParams;
  const agora = new Date();
  // Mesmo critério da contagem regressiva: dias de calendário no fuso do usuário (atrasadas entram aqui).
  const emAte7Dias = (d: Date) => contagemRegressiva(d, agora, fuso).dias <= 7;
  const abertas = todas.filter((a) => !a.concluidaEm);
  const grupos = [
    {
      titulo: "Próximos 7 dias",
      itens: abertas.filter((a) => emAte7Dias(a.entregaEm)),
    },
    {
      titulo: "Mais adiante",
      itens: abertas.filter((a) => !emAte7Dias(a.entregaEm)),
    },
    { titulo: "Concluídas", itens: todas.filter((a) => a.concluidaEm).reverse() },
  ];
  const selecionadaId = idSchema.safeParse(item).success ? (item as string) : abertas[0]?.id;
  const selecionada =
    selecionadaId && todas.some((a) => a.id === selecionadaId)
      ? await obterAvaliacao(usuario.id, selecionadaId)
      : null;

  return (
    <>
      <CabecalhoPagina titulo="Provas e entregas" sobre={`${abertas.length} pendentes`} />
      {!todas.length ? (
        <Cartao>
          <EstadoVazio centro>
            Nenhuma prova ou entrega cadastrada. Use o botão Novo item e escolha Provas.
          </EstadoVazio>
        </Cartao>
      ) : (
        <div className={layout.listaDetalhe}>
          <div className={layout.pilha}>
            {grupos.map((g) => (
              <Cartao key={g.titulo} aria-label={g.titulo}>
                <CartaoCabeca
                  titulo={g.titulo}
                  nivel={2}
                  acao={<span className="mono">{g.itens.length}</span>}
                />
                {g.itens.length ? (
                  <ul className={layout.lista}>
                    {g.itens.map((a) => (
                      <LinhaAvaliacao
                        key={a.id}
                        a={a}
                        fuso={fuso}
                        agora={agora}
                        atual={a.id === selecionada?.id}
                      />
                    ))}
                  </ul>
                ) : (
                  <EstadoVazio>Nada aqui.</EstadoVazio>
                )}
              </Cartao>
            ))}
          </div>
          {selecionada && (
            <Cartao aria-labelledby="detalhe-avaliacao">
              <div className={layout.pilha}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <ChipArea area="provas" texto={TIPO_AVALIACAO_NOME[selecionada.tipo]} />
                  {selecionada.sigla && <ChipArea area="aulas" texto={selecionada.sigla} />}
                  <Contagem alvo={selecionada.entregaEm} agora={agora} fuso={fuso} />
                </div>
                <h2 id="detalhe-avaliacao" style={{ fontSize: 22, fontWeight: 650 }}>
                  {selecionada.titulo}
                </h2>
                <p className="mono" style={{ color: "var(--text-2)" }}>
                  {dataLonga(partesLocais(selecionada.entregaEm, fuso).data)} ·{" "}
                  {horaLocal(selecionada.entregaEm, fuso)}
                </p>
                <div className={layout.numeros}>
                  <div className={layout.numero}>
                    <span className={layout.meta}>Peso</span>
                    <strong>{selecionada.peso ?? "—"}</strong>
                  </div>
                  <div className={layout.numero}>
                    <span className={layout.meta}>Nota</span>
                    <strong>{selecionada.nota ?? "—"}</strong>
                  </div>
                </div>
                <Rotulo>Preparação</Rotulo>
                <Checklist avaliacaoId={selecionada.id} itens={selecionada.checklist} />
                <Rotulo>Lembretes</Rotulo>
                <p className={layout.meta}>
                  {selecionada.lembrarMin === null
                    ? "Sem aviso"
                    : `Aviso ${duracaoTexto(selecionada.lembrarMin)} antes`}
                </p>
                <Rotulo>Anotações</Rotulo>
                <p style={{ whiteSpace: "pre-wrap", color: "var(--text-2)" }}>
                  {selecionada.anotacoes || "Sem anotações."}
                </p>
                <div>
                  <ConcluirAvaliacao id={selecionada.id} concluida={!!selecionada.concluidaEm} />
                </div>
              </div>
            </Cartao>
          )}
        </div>
      )}
    </>
  );
}

function LinhaAvaliacao({
  a,
  fuso,
  agora,
  atual,
}: {
  a: AvaliacaoLista;
  fuso: string;
  agora: Date;
  atual: boolean;
}) {
  return (
    <li>
      <Link
        href={`/provas?item=${a.id}`}
        className={layout.itemLink}
        aria-current={atual ? "page" : undefined}
      >
        <span className={layout.itemTexto}>
          <span className={layout.itemTitulo}>{a.titulo}</span>
          <span className={layout.meta}>
            {TIPO_AVALIACAO_NOME[a.tipo]}
            {a.sigla ? ` · ${a.sigla}` : ""}
            {a.peso !== null ? ` · peso ${a.peso}` : ""} ·{" "}
            <span className="mono">{dataCurta(partesLocais(a.entregaEm, fuso).data)}</span>
          </span>
        </span>
        {!a.concluidaEm && <Contagem alvo={a.entregaEm} agora={agora} fuso={fuso} />}
      </Link>
    </li>
  );
}
