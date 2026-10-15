// Constantes do domínio usadas no banco, na API e na interface (sem dependências de servidor).

export const areaIds = ["aulas", "provas", "estudos", "estagio", "pessoal"] as const;
export type AreaId = (typeof areaIds)[number];

export const assessmentKinds = ["prova", "entrega", "trabalho", "apresentacao"] as const;
export type TipoAvaliacao = (typeof assessmentKinds)[number];

export const TIPO_AVALIACAO_NOME: Record<TipoAvaliacao, string> = {
  prova: "Prova",
  entrega: "Entrega",
  trabalho: "Trabalho",
  apresentacao: "Apresentação",
};

export const repeticoes = ["nunca", "diario", "semanal", "mensal"] as const;
export type Repeticao = (typeof repeticoes)[number];
