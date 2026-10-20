"use client";

import { useState } from "react";
import { percentual, periodoTexto, textoFaltam } from "@/lib/roadmap";
import { difDias } from "@/lib/tempo";
import type { FaseRoadmap } from "@/server/servicos/roadmap";
import { Icone } from "../../shell/icones";
import { feitosDe } from "./comum";
import s from "./Roadmap.module.css";

const ROTULO_PORTAO = {
  exam: "Portão: prova",
  project: "Portão: projeto",
  milestone: "Portão: marco",
};

/** No iPhone, a lista começa com estes requisitos e abre o resto no botão. */
const VISIVEIS_NO_IPHONE = 5;

function Anel({ valor, rotulo }: { valor: number; rotulo: string }) {
  const r = 42;
  const volta = 2 * Math.PI * r;
  return (
    <div
      className={s.anel}
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valor}
    >
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={r} className={s.anelFundo} />
        <circle
          cx="50"
          cy="50"
          r={r}
          className={s.anelValor}
          strokeDasharray={volta}
          strokeDashoffset={volta * (1 - valor / 100)}
        />
      </svg>
      <span className={`${s.anelTexto} mono`}>{valor}%</span>
    </div>
  );
}

/** Coluna do portão: prazo, o que a prova cobra, requisitos para passar e a dica da fase. */
export function Portao({
  fase,
  numero,
  hoje,
  aoAlternar,
}: {
  fase: FaseRoadmap;
  numero: number;
  hoje: string;
  aoAlternar: (id: string) => void;
}) {
  const [todos, setTodos] = useState(false);
  const feitos = feitosDe(fase);
  const pct = percentual(feitos, fase.requisitos.length);
  const dias = difDias(hoje, fase.portaoData);
  const comPeso = fase.dominios.some((d) => d.peso !== null);
  const maiorPeso = Math.max(1, ...fase.dominios.map((d) => d.peso ?? 0));
  const escondidos = fase.requisitos.length - VISIVEIS_NO_IPHONE;

  return (
    <section className={`${s.portao} ${s.entrada}`} aria-labelledby="portao-nome">
      <span className={`${s.etiqueta} mono`}>
        Fase {numero} · {fase.semanas}
      </span>
      <h2 className={s.portaoFase}>{fase.nome}</h2>
      <p className={`${s.portaoPeriodo} mono`}>{periodoTexto(fase)}</p>

      <div className={s.portaoResumo}>
        <Anel valor={pct} rotulo={`Requisitos da fase ${numero}`} />
        <div className={s.portaoTexto}>
          <span className={s.rotulo}>{ROTULO_PORTAO[fase.portaoTipo]}</span>
          {fase.portaoTipo === "exam" ? (
            <h3 id="portao-nome" className={s.portaoNome}>
              {fase.portao}
              <span>{fase.portaoNome}</span>
            </h3>
          ) : (
            // Marco ou projeto: o nome completo é o título; o formato explica o que conta.
            <h3 id="portao-nome" className={s.portaoNome}>
              {fase.portaoNome}
            </h3>
          )}
          <p className={s.portaoFormato}>{fase.portaoFormato}</p>
          <p className={`${s.faltam} mono`}>{textoFaltam(dias)}</p>
        </div>
      </div>

      <div className={s.bloco}>
        <h3 className={s.blocoTitulo}>
          {fase.dominiosTitulo}
          {!comPeso && <span className={s.selo}>objetivo</span>}
        </h3>
        <ul className={s.dominios}>
          {fase.dominios.map((d) => (
            <li key={d.id} data-sem-peso={d.peso === null || undefined}>
              <span className={s.dominioTexto}>
                <span>{d.rotulo}</span>
                {d.peso !== null && <span className="mono">{d.peso}%</span>}
              </span>
              <span className={s.dominioBarra} aria-hidden>
                <span style={{ width: `${d.peso === null ? 100 : (d.peso / maiorPeso) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className={s.bloco}>
        <h3 className={s.blocoTitulo}>
          Requisitos para passar
          <span className={`${s.blocoContagem} mono`}>
            {feitos}/{fase.requisitos.length}
          </span>
        </h3>
        <ul className={s.requisitos} data-todos={todos || undefined}>
          {fase.requisitos.map((r, i) => (
            <li key={r.id} data-excedente={i >= VISIVEIS_NO_IPHONE || undefined}>
              <button
                type="button"
                className={s.requisito}
                aria-pressed={r.feito}
                onClick={() => aoAlternar(r.id)}
              >
                <span className={s.caixa} aria-hidden>
                  <Icone nome="check" tamanho={14} strokeWidth={2.4} />
                </span>
                <span className={s.requisitoTexto}>{r.rotulo}</span>
              </button>
            </li>
          ))}
        </ul>
        {escondidos > 0 && !todos && (
          <button type="button" className={s.verTodos} onClick={() => setTodos(true)}>
            Ver os {fase.requisitos.length} requisitos
          </button>
        )}
      </div>

      {fase.dica && (
        <aside className={`${s.dica} ${s.dicaPortao}`} aria-label="Dica da fase">
          {fase.dica}
        </aside>
      )}
    </section>
  );
}
