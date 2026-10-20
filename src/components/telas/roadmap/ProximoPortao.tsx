"use client";

import { dataNumerica, percentual, textoFaltam, type EstacaoInicial } from "@/lib/roadmap";
import { difDias } from "@/lib/tempo";
import type { FaseRoadmap, PausaRoadmap } from "@/server/servicos/roadmap";
import { Icone } from "../../shell/icones";
import { coresDaFase, dataBr, feitosDe } from "./comum";
import s from "./Roadmap.module.css";

/** Card escuro com o portão da fase atual, a contagem regressiva e o atalho para o que falta. */
const ATE = { exam: "até a prova", project: "até a entrega", milestone: "até o portão" };

export function ProximoPortao({
  fase,
  hoje,
  icone,
  pausa,
  inicio,
  aoVer,
}: {
  fase: FaseRoadmap;
  hoje: string;
  icone: string;
  /** Pausa em que hoje cai: a contagem continua, mas o card avisa até quando. */
  pausa: PausaRoadmap | null;
  inicio: EstacaoInicial;
  aoVer: () => void;
}) {
  const dias = difDias(hoje, fase.portaoData);
  const feitos = feitosDe(fase);
  const pct = percentual(feitos, fase.requisitos.length);
  return (
    <section className={s.proximo} style={coresDaFase(fase)} aria-labelledby="proximo-portao">
      <span className={s.proximoTopo}>
        <span className={s.proximoRotulo} id="proximo-portao">
          Próximo portão
        </span>
        <Icone
          nome={icone === "escudo" ? "escudo" : "areas"}
          tamanho={22}
          className={s.proximoIcone}
        />
      </span>
      {pausa && (
        <span className={`${s.emPausa} mono`}>Semana leve até {dataNumerica(pausa.fim)}</span>
      )}
      <div className={s.proximoNome}>
        <strong>{fase.portao}</strong>
        <span>{fase.portaoNome}</span>
      </div>
      <p className={s.proximoDias}>
        <span className="mono">{Math.max(0, dias)}</span>
        <span>{dias === 1 ? "dia" : "dias"}</span>
      </p>
      <p className={s.proximoMeta}>
        {dias < 0 ? textoFaltam(dias) : ATE[fase.portaoTipo]} ·{" "}
        <span className="mono">{dataBr(fase.portaoData)}</span>
      </p>
      <div className={s.proximoBarra}>
        <span className={s.proximoBarraTexto}>
          Requisitos{" "}
          <span className="mono">
            {feitos}/{fase.requisitos.length}
          </span>
          {inicio?.tipo === "antes" && (
            <>
              {" "}
              · começa em{" "}
              <span className="mono">
                {inicio.dias} {inicio.dias === 1 ? "dia" : "dias"}
              </span>
            </>
          )}
        </span>
        <div
          className={s.barraEscura}
          role="progressbar"
          aria-label={`Requisitos do portão ${fase.portao}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button type="button" className={s.proximoBotao} onClick={aoVer}>
        Ver o que falta <Icone nome="seta" tamanho={18} />
      </button>
    </section>
  );
}
