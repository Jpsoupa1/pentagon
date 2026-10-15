import type { AreaId } from "@/lib/dominio";

export type Area = {
  id: AreaId;
  nome: string;
  curto: string;
  cor: string;
  fundo: string;
  texto: string;
};

/** As 5 áreas fixas (lados do pentágono). Fonte única para o seed e para a interface. */
export const AREAS: readonly Area[] = [
  {
    id: "aulas",
    nome: "Aulas",
    curto: "Aulas",
    cor: "#4361EE",
    fundo: "#EBEFFE",
    texto: "#2F4AD0",
  },
  {
    id: "provas",
    nome: "Provas e entregas",
    curto: "Provas",
    cor: "#F2643D",
    fundo: "#FEEDE7",
    texto: "#B8400F",
  },
  {
    id: "estudos",
    nome: "Estudos",
    curto: "Estudos",
    cor: "#12A37A",
    fundo: "#E3F5EF",
    texto: "#0B7A5B",
  },
  {
    id: "estagio",
    nome: "Estágio",
    curto: "Estágio",
    cor: "#8E4FD6",
    fundo: "#F2EAFB",
    texto: "#7039B8",
  },
  {
    id: "pessoal",
    nome: "Pessoal",
    curto: "Pessoal",
    cor: "#E0A100",
    fundo: "#FBF3DC",
    texto: "#8A6300",
  },
];

export const AREA_POR_ID = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, Area>;

export function isAreaId(valor: string): valor is AreaId {
  return valor in AREA_POR_ID;
}
