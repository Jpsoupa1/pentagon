"use client";

import { dataNumerica, percentual } from "@/lib/roadmap";
import type { RoadmapDados, FaseRoadmap } from "@/server/servicos/roadmap";
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
  semanaZeroAgora,
  selecionada,
  aoSelecionar,
}: Selecao & Pick<RoadmapDados, "trilha" | "semanaZeroAgora">) {
  return (
    <section className={s.mapa} aria-label="Mapa da trilha">
      <ol className={s.linha}>
        {trilha.semanaZeroRotulo && (
          <li className={s.terminal}>
            <span className={s.estacaoPonto} aria-hidden />
            <span className={s.estacaoNome}>{trilha.semanaZeroRotulo}</span>
            {semanaZeroAgora ? (
              <span className={s.aqui}>Você está aqui</span>
            ) : (
              <span className={`${s.estacaoMeta} mono`}>
                {trilha.semanaZeroInicio && dataNumerica(trilha.semanaZeroInicio)}
              </span>
            )}
          </li>
        )}
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
