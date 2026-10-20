"use client";

import { dataNumerica, percentual } from "@/lib/roadmap";
import type { FaseRoadmap, PausaRoadmap, RoadmapDados } from "@/server/servicos/roadmap";
import { Icone } from "../../shell/icones";
import { coresDaFase, feitosDe } from "./comum";
import s from "./Roadmap.module.css";

type Selecao = {
  fases: FaseRoadmap[];
  atual: number;
  selecionada: number;
  aoSelecionar: (i: number) => void;
};

/**
 * Notebook: a trilha como uma linha de metrô. Da Semana zero até a fase atual a linha é cheia;
 * dali em diante, tracejada. Clicar numa estação seleciona a fase.
 */
export function Mapa({
  trilha,
  fases,
  atual,
  inicio,
  selecionada,
  aoSelecionar,
}: Selecao & Pick<RoadmapDados, "trilha" | "inicio">) {
  return (
    <section className={s.mapa} aria-label="Mapa da trilha">
      <ol className={s.linha}>
        <li className={s.terminal}>
          <span className={s.estacaoPonto} aria-hidden />
          <span className={s.estacaoNome}>{trilha.rotuloInicio}</span>
          {inicio?.tipo === "aqui" ? (
            <span className={s.aqui}>Você está aqui</span>
          ) : inicio?.tipo === "antes" ? (
            <span className={`${s.emBreve} mono`}>
              em {inicio.dias} {inicio.dias === 1 ? "dia" : "dias"}
            </span>
          ) : (
            <span className={`${s.estacaoMeta} mono`}>{dataNumerica(trilha.inicio)}</span>
          )}
        </li>
        {fases.map((f, i) => {
          const pct = percentual(feitosDe(f), f.requisitos.length);
          return (
            <li
              key={f.id}
              className={s.estacao}
              style={coresDaFase(f)}
              data-trecho={i <= atual ? "cheio" : "tracejado"}
            >
              <button
                type="button"
                className={s.estacaoBotao}
                aria-pressed={i === selecionada}
                aria-current={i === atual ? "step" : undefined}
                onClick={() => aoSelecionar(i)}
              >
                <span className={s.estacaoCirculo} data-atual={i === atual || undefined}>
                  <span className="mono">{i + 1}</span>
                </span>
                <span className={s.estacaoNome}>{f.curto}</span>
                <span className={`${s.estacaoMeta} mono`}>
                  {f.portao} · {dataNumerica(f.portaoData)}
                </span>
                <span className={s.miniBarra} aria-hidden>
                  <span style={{ width: `${pct}%` }} />
                </span>
                <span className="sr-only">
                  , {pct}% dos requisitos{i === atual ? ", fase atual" : ""}
                </span>
              </button>
            </li>
          );
        })}
        <li className={s.terminal} data-trecho="tracejado">
          <span className={`${s.estacaoPonto} ${s.pontoFim}`} aria-hidden>
            <Icone nome="bandeira" tamanho={16} />
          </span>
          <span className={s.estacaoNome}>{trilha.meta}</span>
          {trilha.metaNota && <span className={s.estacaoMeta}>{trilha.metaNota}</span>}
        </li>
      </ol>
    </section>
  );
}

/** iPhone e iPad em retrato: as fases como pílulas que rolam na horizontal. */
export function Pilulas({ fases, atual, selecionada, aoSelecionar }: Selecao) {
  return (
    <div className={s.pilulas} role="group" aria-label="Fases da trilha">
      {fases.map((f, i) => (
        <button
          key={f.id}
          type="button"
          className={s.pilula}
          style={coresDaFase(f)}
          aria-pressed={i === selecionada}
          aria-current={i === atual ? "step" : undefined}
          onClick={() => aoSelecionar(i)}
        >
          <span className={`${s.pilulaNumero} mono`}>{i + 1}</span>
          <span className={s.pilulaTexto}>
            <strong>{f.curto}</strong>
            <span className="mono">
              {f.portao} · {percentual(feitosDe(f), f.requisitos.length)}%
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Períodos em que a trilha para, com a cor da fase da outra trilha que motiva cada pausa. */
export function Pausas({ pausas, agora }: { pausas: PausaRoadmap[]; agora: PausaRoadmap | null }) {
  const ligadas = new Set(pausas.map((p) => p.trilhaLigada?.nome).filter(Boolean));
  const outra = ligadas.size === 1 ? [...ligadas][0]!.replace(/^Trilha /, "") : null;
  return (
    <section className={s.pausas} aria-labelledby="pausas-titulo">
      <h2 id="pausas-titulo" className={s.pausasTitulo}>
        {outra ? `Pausas para a ${outra}` : "Pausas"}
      </h2>
      <ul className={s.pausasLista}>
        {pausas.map((p) => (
          <li key={p.id} className={s.pausa} aria-current={p.id === agora?.id ? "true" : undefined}>
            <span className={s.pausaPonto} style={{ background: p.cor }} aria-hidden />
            <span className={s.pausaNome}>{p.rotulo}</span>
            <span className={`${s.pausaPeriodo} mono`}>
              {dataNumerica(p.inicio)} a {dataNumerica(p.fim)}
            </span>
            {p.id === agora?.id && <span className="sr-only">(agora)</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
