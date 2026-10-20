"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { disponiveis, rodada, sessaoDoDia, sorteio, type CardCliente } from "@/lib/cards";
import { useAcervo } from "@/lib/cliente/cards";
import type { ModoCard, ResultadoCard } from "@/lib/dominio";
import { BarraProgresso } from "../../ui/BarraProgresso";
import { Botao, BotaoLink } from "../../ui/Botao";
import { Cartao, CartaoCabeca } from "../../ui/Cartao";
import { ControleSegmentado } from "../../ui/ControleSegmentado";
import { EstadoVazio } from "../../ui/EstadoVazio";
import ui from "../../ui/ui.module.css";
import { AcervoVazio, AvisoAcervo, FiltrosTrilhaTema, nomeCaixa, type Filtro } from "./comum";
import s from "./Cards.module.css";

/** Um passo da sessão. `repeticao`: card errado hoje que voltou para o fim da fila. */
type Item = { id: string; repeticao: boolean };

type Sessao = {
  fila: Item[];
  pos: number;
  virado: boolean;
  acertos: number;
  erros: number;
  semFim: boolean;
  filtro: Filtro;
};

type Quantidade = "10" | "20" | "sem-fim";

/**
 * Sessão de revisão. No modo "dia", a fila sai da agenda das caixas; errou, o card volta
 * no fim da sessão (a repetição não mexe de novo no agendamento). No "aleatorio", sorteia
 * do acervo inteiro (ou da trilha/tema escolhidos) sem repetir até esgotar.
 */
export function SessaoCards({ modo }: { modo: ModoCard }) {
  const { dados, estado, hoje, responder } = useAcervo();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [quantidade, setQuantidade] = useState<Quantidade>("10");
  const [filtro, setFiltro] = useState<Filtro>({ trilha: "", tema: "" });

  const mapa = useMemo(() => new Map(dados?.cards.map((c) => [c.id, c])), [dados]);
  // Até a primeira resposta, a sessão do dia acompanha a cópia mais recente do acervo.
  const filaDoDia = useMemo<Item[]>(
    () =>
      modo === "dia" && dados && hoje
        ? sessaoDoDia(dados.cards, dados.respostas, dados.limite, hoje).map((c) => ({
            id: c.id,
            repeticao: false,
          }))
        : [],
    [modo, dados, hoje],
  );
  const atual: Sessao | null =
    sessao ??
    (modo === "dia"
      ? {
          fila: filaDoDia,
          pos: 0,
          virado: false,
          acertos: 0,
          erros: 0,
          semFim: false,
          filtro: { trilha: "", tema: "" },
        }
      : null);
  const item = atual && atual.pos < atual.fila.length ? atual.fila[atual.pos] : null;
  const card = item ? mapa.get(item.id) : undefined;

  function virar() {
    if (atual && card) setSessao({ ...atual, virado: !atual.virado });
  }

  function marcar(resultado: ResultadoCard) {
    if (!atual || !item || (card && !atual.virado) || !dados) return;
    let fila = atual.fila;
    if (card && !item.repeticao) responder(card, resultado, modo);
    if (modo === "dia" && resultado === "errou") fila = [...fila, { id: item.id, repeticao: true }];
    // Sem fim: acabou a rodada, sorteia outra (de novo sem repetir até esgotar).
    if (atual.semFim && atual.pos + 1 >= fila.length) {
      fila = [
        ...fila,
        ...ids(rodada(disponiveis(dados.cards, atual.filtro), Math.random, item.id)),
      ];
    }
    setSessao({
      ...atual,
      fila,
      pos: atual.pos + 1,
      virado: false,
      acertos: atual.acertos + (resultado === "acertou" ? 1 : 0),
      erros: atual.erros + (resultado === "errou" ? 1 : 0),
    });
  }

  // Teclado no notebook: espaço vira, 1 ou ← errei, 2 ou → acertei.
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.closest("input, select, textarea")) return;
      if (e.key === " " && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        virar();
      } else if (e.key === "1" || e.key === "ArrowLeft") marcar("errou");
      else if (e.key === "2" || e.key === "ArrowRight") marcar("acertou");
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  if (!dados || !hoje) return <AvisoAcervo estado={estado} />;
  if (!dados.cards.length) return <AcervoVazio />;

  if (!atual) {
    const total = disponiveis(dados.cards, filtro).length;
    return (
      <Cartao className={s.sessao}>
        <CartaoCabeca titulo="Tema aleatório" />
        <div className={s.fim}>
          <ControleSegmentado<Quantidade>
            rotulo="Quantidade"
            valor={quantidade}
            aoMudar={setQuantidade}
            opcoes={[
              { valor: "10", rotulo: "10" },
              { valor: "20", rotulo: "20" },
              { valor: "sem-fim", rotulo: "Sem fim" },
            ]}
          />
          <div style={{ width: "100%" }}>
            <FiltrosTrilhaTema cards={dados.cards} valor={filtro} aoMudar={setFiltro} />
          </div>
          <p className={s.destaqueMeta} style={{ color: "var(--text-2)" }}>
            {total} {total === 1 ? "card disponível" : "cards disponíveis"}, de qualquer data de
            revisão. Suspensos ficam de fora.
          </p>
          <Botao
            largo
            disabled={!total}
            onClick={() => {
              const semFim = quantidade === "sem-fim";
              setSessao({
                fila: ids(
                  sorteio(dados.cards, {
                    ...filtro,
                    quantidade: semFim ? null : Number(quantidade),
                  }),
                ),
                pos: 0,
                virado: false,
                acertos: 0,
                erros: 0,
                semFim,
                filtro,
              });
            }}
          >
            Sortear e começar
          </Botao>
        </div>
      </Cartao>
    );
  }

  if (!item) {
    if (modo === "dia" && !sessao) {
      return (
        <Cartao className={s.sessao}>
          <EstadoVazio
            centro
            acao={
              <BotaoLink href="/cards/aleatorio" variante="primario" pequeno>
                Tema aleatório
              </BotaoLink>
            }
          >
            Nada para revisar hoje. Quer treinar com cards sorteados do acervo?
          </EstadoVazio>
        </Cartao>
      );
    }
    return (
      <Cartao className={s.sessao}>
        <div className={s.fim} role="status">
          <CartaoCabeca titulo="Sessão concluída" />
          <p className={s.fimNumeros}>
            <span>
              <strong>{atual.acertos}</strong> acertos
            </span>
            <span>
              <strong>{atual.erros}</strong> erros
            </span>
          </p>
          <div className={s.acoesFolha}>
            <BotaoLink href="/cards" variante="primario">
              Voltar para Cards
            </BotaoLink>
            {modo === "aleatorio" && (
              <Botao variante="secundario" onClick={() => setSessao(null)}>
                Sortear de novo
              </Botao>
            )}
          </div>
        </div>
      </Cartao>
    );
  }

  const total = atual.fila.length;
  return (
    <div className={s.sessao}>
      <div className={s.progresso}>
        <span className={s.contador} aria-live="polite">
          {atual.pos + 1} {atual.semFim ? "· sem fim" : `de ${total}`}
        </span>
        <BarraProgresso valor={atual.semFim ? 0 : atual.pos / total} rotulo="Progresso da sessão" />
        <Link href="/cards">Sair</Link>
      </div>
      {card ? (
        <CartaoVirado
          card={card}
          virado={atual.virado}
          repeticao={item.repeticao}
          aoVirar={virar}
        />
      ) : (
        <Cartao>
          <EstadoVazio>Este card foi apagado.</EstadoVazio>
        </Cartao>
      )}
      <div className={s.respostas}>
        {atual.virado || !card ? (
          <>
            <Botao className={`${s.resposta} ${s.errei}`} onClick={() => marcar("errou")}>
              Errei
            </Botao>
            <Botao className={`${s.resposta} ${s.acertei}`} onClick={() => marcar("acertou")}>
              Acertei
            </Botao>
          </>
        ) : (
          <Botao variante="secundario" className={s.resposta} onClick={virar}>
            Mostrar resposta
          </Botao>
        )}
      </div>
    </div>
  );
}

function ids(cards: CardCliente[]): Item[] {
  return cards.map((c) => ({ id: c.id, repeticao: false }));
}

function CartaoVirado({
  card,
  virado,
  repeticao,
  aoVirar,
}: {
  card: CardCliente;
  virado: boolean;
  repeticao: boolean;
  aoVirar: () => void;
}) {
  return (
    <div
      className={`${s.card} ${virado ? s.virado : ""}`}
      role="button"
      tabIndex={0}
      aria-label={virado ? "Card virado: toque para ver só a frente" : "Toque para virar o card"}
      onClick={(e) => {
        // Rolar o código na horizontal ou selecionar texto não vira o card.
        if ((e.target as HTMLElement).closest("pre") || window.getSelection()?.toString()) return;
        aoVirar();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") aoVirar();
      }}
      data-area="estudos"
    >
      <span className={s.cardTopo}>
        <span className={ui.chip}>
          <span className={ui.ponto} aria-hidden />
          {card.trilha}
        </span>
        <span className={s.contador}>
          {card.tema} · {nomeCaixa(card)}
          {repeticao ? " · repetição" : ""}
        </span>
      </span>
      <p className={s.frente}>{card.frente}</p>
      {virado ? (
        <>
          <p className={s.verso}>{card.verso}</p>
          {card.codigo && (
            <pre className={s.codigo} tabIndex={0} aria-label="Código">
              <code>{card.codigo}</code>
            </pre>
          )}
        </>
      ) : (
        <span className={s.dica}>Toque para virar</span>
      )}
    </div>
  );
}
