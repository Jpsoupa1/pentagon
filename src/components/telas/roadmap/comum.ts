import type { CSSProperties } from "react";
import type { FaseRoadmap } from "@/server/servicos/roadmap";

/** As três cores da fase vêm do banco; o CSS deriva delas as variantes do modo escuro. */
export function coresDaFase(f: FaseRoadmap): CSSProperties {
  return {
    "--fase-cor": f.cor,
    "--fase-cor-texto": f.corTexto,
    "--fase-cor-suave": f.corSuave,
  } as CSSProperties;
}

export const feitosDe = (f: FaseRoadmap) => f.requisitos.filter((r) => r.feito).length;

/** "05/03/2027" */
export const dataBr = (d: string) => d.split("-").reverse().join("/");
