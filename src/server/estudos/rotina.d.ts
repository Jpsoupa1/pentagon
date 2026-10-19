// Tipos do arquivo trilha_devops.js (fonte dos dados da trilha).
import type { CategoriaSessao, Turno } from "@/lib/estudos";

export type RotinaSemana = {
  n: number;
  inicio: string;
  fase: number;
  bloco: number;
  tema: string;
  parte: string;
  manha: string[];
  tarde: string[];
  sex: string;
  sab: string;
};
export type RotinaSessao = {
  id: string;
  data: string;
  dow: number;
  turno: Turno;
  /** Chave do horário em Ajustes: `<dia>-<turno>`. */
  chave: string;
  ini: string;
  fim: string;
  iniMin: number;
  min: number;
  semana: number;
  fase: number;
  faseNome: string;
  tema: string;
  parte: string;
  categoria: CategoriaSessao;
  tipo: string;
  texto: string;
  titulo: string;
  permiteSobreposicao: boolean;
};
export type RotinaCfg = {
  turnos: Record<string, { on: boolean; ini: string; min: number }>;
  alerta: number;
};
export type Rotina = {
  INICIO: string;
  FIM: string;
  TOTAL_SEMANAS: number;
  FASES: { id: number; nome: string; curto: string; prova: string }[];
  SEMANAS: RotinaSemana[];
  MARCOS: { data: string; titulo: string; fase: number; prova?: boolean }[];
  TIPOS: Record<number, string>;
  CATEGORIAS: CategoriaSessao[];
  TURNOS: Turno[];
  PADRAO: RotinaCfg;
  semanaDe(data: string): RotinaSemana | null;
  sessoesDoDia(data: string, cfg?: RotinaCfg): RotinaSessao[];
  sessoesEntre(a: string, b: string, cfg?: RotinaCfg): RotinaSessao[];
  titulo(tipo: string, texto: string): string;
  gerarICS(cfg?: RotinaCfg, desde?: string, opcoes?: { agora?: Date; url?: string }): string;
};
