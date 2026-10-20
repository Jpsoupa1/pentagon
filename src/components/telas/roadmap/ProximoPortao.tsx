"use client";

import { percentual, textoFaltam } from "@/lib/roadmap";
import { difDias } from "@/lib/tempo";
import type { FaseRoadmap } from "@/server/servicos/roadmap";
import { Icone } from "../../shell/icones";
import { coresDaFase, dataBr, feitosDe } from "./comum";
import s from "./Roadmap.module.css";

/** Card escuro com o portão da fase atual, a contagem regressiva e o atalho para o que falta. */
export function ProximoPortao({
  fase,
  hoje,
  aoVer,
}: {
  fase: FaseRoadmap;
  hoje: string;
  aoVer: () => void;
}) {
  const dias = difDias(hoje, fase.portaoData);
  const feitos = feitosDe(fase);
  const pct = percentual(feitos, fase.requisitos.length);
  return (
    <section className={s.proximo} style={coresDaFase(fase)} aria-labelledby="proximo-portao">
      <span className={s.proximoRotulo} id="proximo-portao">
        Próximo portão
      </span>
      <div className={s.proximoNome}>
        <strong>{fase.portao}</strong>
        <span>{fase.portaoNome}</span>
      </div>
      <p className={s.proximoDias}>
        <span className="mono">{Math.max(0, dias)}</span>
        <span>{dias === 1 ? "dia" : "dias"}</span>
      </p>
      <p className={s.proximoMeta}>
        {dias < 0
          ? textoFaltam(dias)
          : fase.portaoTipo === "exam"
            ? "até a prova"
            : "até a entrega"}{" "}
        · <span className="mono">{dataBr(fase.portaoData)}</span>
      </p>
      <div className={s.proximoBarra}>
        <span className={s.proximoBarraTexto}>
          Requisitos{" "}
          <span className="mono">
            {feitos}/{fase.requisitos.length}
          </span>
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
