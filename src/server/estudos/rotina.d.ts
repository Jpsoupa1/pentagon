// Tipos do arquivo trilha_devops.js (fonte dos dados da trilha).
export type RotinaSemana = {
  n: number;
  inicio: string;
  fase: number;
  bloco: number;
  tema: string;
  parte: string;
};
export type RotinaSessao = {
  data: string;
  dow: number;
  ini: string;
  fim: string;
  iniMin: number;
  min: number;
  semana: number;
  fase: number;
  faseNome: string;
  tema: string;
  parte: string;
  tipo: string;
  texto: string;
};
export type RotinaCfg = {
  dias: Record<number, { on: boolean; ini: string; min: number }>;
  alerta: number;
};
export type Rotina = {
  INICIO: string;
  FIM: string;
  TOTAL_SEMANAS: number;
  FASES: { id: number; nome: string; curto: string; prova: string }[];
  SEMANAS: RotinaSemana[];
  MARCOS: { data: string; titulo: string; fase: number; prova?: boolean }[];
  PADRAO: RotinaCfg;
  sessao(data: string, cfg?: RotinaCfg): RotinaSessao | null;
  sessoesEntre(a: string, b: string, cfg?: RotinaCfg): RotinaSessao[];
  gerarICS(cfg?: RotinaCfg, desde?: string, opcoes?: { agora?: Date; url?: string }): string;
};
