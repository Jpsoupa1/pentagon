import { addDias } from "./tempo";

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): string {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Feriados nacionais e os pontos facultativos federais mais comuns (Carnaval e Corpus Christi). */
export function feriadosNacionais(ano: number): { data: string; nome: string }[] {
  const p = pascoa(ano);
  return [
    { data: `${ano}-01-01`, nome: "Confraternização Universal" },
    { data: addDias(p, -48), nome: "Carnaval (ponto facultativo)" },
    { data: addDias(p, -47), nome: "Carnaval (ponto facultativo)" },
    { data: addDias(p, -2), nome: "Sexta-feira Santa" },
    { data: `${ano}-04-21`, nome: "Tiradentes" },
    { data: `${ano}-05-01`, nome: "Dia do Trabalho" },
    { data: addDias(p, 60), nome: "Corpus Christi (ponto facultativo)" },
    { data: `${ano}-09-07`, nome: "Independência do Brasil" },
    { data: `${ano}-10-12`, nome: "Nossa Senhora Aparecida" },
    { data: `${ano}-11-02`, nome: "Finados" },
    { data: `${ano}-11-15`, nome: "Proclamação da República" },
    { data: `${ano}-11-20`, nome: "Dia Nacional de Zumbi e da Consciência Negra" },
    { data: `${ano}-12-25`, nome: "Natal" },
  ].sort((x, y) => x.data.localeCompare(y.data));
}
