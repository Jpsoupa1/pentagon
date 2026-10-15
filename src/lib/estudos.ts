import type { HorariosEstudo } from "./dominio";

// Regras da trilha que a interface também usa (sem dependências de servidor).

/** Tipo de sessão por dia da semana (0 = domingo). */
export const TIPO_SESSAO: Record<number, string> = {
  0: "Revisão",
  1: "Aula",
  2: "Lab",
  3: "Aprofundar",
  4: "Base",
  5: "Reposição",
  6: "Projeto",
};

/**
 * Horários padrão: as noites são da faculdade, então o estudo fica à tarde.
 * Segunda a quinta 14:00 às 15:30, sábado 09:00 às 12:00, domingo 19:00 às 20:00,
 * sexta (Reposição) desligada.
 */
export const HORARIOS_PADRAO: HorariosEstudo = {
  "0": { ativo: true, inicio: "19:00", minutos: 60 },
  "1": { ativo: true, inicio: "14:00", minutos: 90 },
  "2": { ativo: true, inicio: "14:00", minutos: 90 },
  "3": { ativo: true, inicio: "14:00", minutos: 90 },
  "4": { ativo: true, inicio: "14:00", minutos: 90 },
  "5": { ativo: false, inicio: "14:00", minutos: 60 },
  "6": { ativo: true, inicio: "09:00", minutos: 180 },
};

export function horariosComPadrao(h: HorariosEstudo | null | undefined): HorariosEstudo {
  return { ...HORARIOS_PADRAO, ...(h ?? {}) };
}
