import type { AreaId } from "@/lib/dominio";
import type { NomeIcone } from "./icones";

export type ItemNav = {
  href: string;
  rotulo: string;
  curto: string;
  icone: NomeIcone;
  area?: AreaId;
  contador?: keyof Contadores;
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
  },
  { href: "/trilhas", rotulo: "Trilhas", curto: "Trilhas", icone: "trilhas", area: "estudos" },
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

export function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
