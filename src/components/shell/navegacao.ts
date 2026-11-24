import type { AreaId } from "@/lib/dominio";
import type { NomeIcone } from "./icones";

export type ItemNav = {
  href: string;
  rotulo: string;
  curto: string;
  icone: NomeIcone;
  area?: AreaId;
  contador?: keyof Contadores;
  /** Só aparece para quem recebe o conteúdo pessoal (OWNER_EMAILS). */
  soDono?: boolean;
  /** Some para quem recebe o conteúdo pessoal: o Plano ocupa o lugar da entrada. */
  somePraDono?: boolean;
};

export type Contadores = { aulas: number; provas: number; estudos: number; lembretes: number };

export const MENU: ItemNav[] = [
  { href: "/", rotulo: "Hoje", curto: "Hoje", icone: "hoje" },
  { href: "/agenda", rotulo: "Agenda", curto: "Agenda", icone: "agenda" },
  {
    href: "/aulas",
    rotulo: "Aulas",
    curto: "Aulas",
    icone: "aulas",
    area: "aulas",
    contador: "aulas",
  },
  {
    href: "/provas",
    rotulo: "Provas e entregas",
    curto: "Provas",
    icone: "provas",
    area: "provas",
    contador: "provas",
  },
  {
    href: "/estudos",
    rotulo: "Estudos",
    curto: "Estudos",
    icone: "estudos",
    area: "estudos",
    contador: "estudos",
    somePraDono: true,
  },
  {
    href: "/trilhas",
    rotulo: "Trilhas",
    curto: "Trilhas",
    icone: "trilhas",
    area: "estudos",
    somePraDono: true,
  },
  { href: "/plano", rotulo: "Plano", curto: "Plano", icone: "plano", soDono: true },
  { href: "/cards", rotulo: "Cards", curto: "Cards", icone: "cards", area: "estudos" },
  { href: "/estagio", rotulo: "Estágio", curto: "Estágio", icone: "estagio", area: "estagio" },
  {
    href: "/lembretes",
    rotulo: "Lembretes",
    curto: "Lembretes",
    icone: "lembretes",
    contador: "lembretes",
  },
];

export const SECUNDARIO: ItemNav[] = [
  { href: "/voz", rotulo: "Assistente", curto: "Assistente", icone: "microfone" },
  { href: "/areas", rotulo: "Áreas", curto: "Áreas", icone: "areas" },
  { href: "/ajustes", rotulo: "Ajustes", curto: "Ajustes", icone: "ajustes" },
];

/** O menu que a pessoa enxerga: dono troca Estudos e Trilhas pelo Plano; os demais mantêm o menu atual. */
export const menuDe = (dono: boolean) =>
  [...MENU, ...SECUNDARIO].filter((i) => (dono ? !i.somePraDono : !i.soDono));

export function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
