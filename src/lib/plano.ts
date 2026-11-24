// Regras do plano de estudos AI Engineer (sem dependências de servidor): leitura e validação do
// seed, item atual de cada trilha, conclusão, desfazer, conteúdo do bloco, troca, horas e
// recrutamento. O servidor usa estas funções para decidir; a tela, só para mostrar.
import { z } from "zod";
import { addDias, diaDaSemana } from "./tempo";

export const slugsTrilha = ["teoria", "cursos", "projetos"] as const;
export type SlugTrilha = (typeof slugsTrilha)[number];

export const blocosPlano = ["manha", "teoria", "projeto"] as const;
export type BlocoPlano = (typeof blocosPlano)[number];

/** Início e duração de cada bloco, por tipo de dia (Ajustes; nulo no banco usa os padrões). */
export type BlocosPlanoAjustes = Partial<
  Record<
    "dias_uteis" | "sabado" | "domingo",
    Partial<Record<BlocoPlano, { inicio: string; minutos?: number; ligado?: boolean }>>
  >
>;

/** Duração padrão de cada bloco, em minutos, quando Ajustes não define (a manhã segue a folga do dia). */
export const MINUTOS_PADRAO_BLOCO: Record<BlocoPlano, number> = {
  manha: 60,
  teoria: 90,
  projeto: 80,
};

export const SUGESTAO_INICIAL = ["A0", "C1"] as const;

// ---------------------------------------------------------------------------------------------
// Seed

const texto = z.string().trim().min(1);
const codigo = z.string().regex(/^[A-Z]\d+[a-z]?$/, "Código inválido");

const avaliacaoSchema = z.discriminatedUnion("tipo", [
  z.strictObject({
    tipo: z.literal("nota"),
    minima: z.number().min(0).max(100),
    aprovacoes: z.number().int().default(1),
  }),
  z.strictObject({ tipo: z.literal("aprovacao") }),
]);

const itemSchema = z.strictObject({
  codigo,
  trilha: z.enum(slugsTrilha),
  fase: z.number().int().optional(),
  titulo: texto,
  estudar: texto.optional(),
  recurso: texto.optional(),
  criterio: texto,
  horas: z.number(),
  requisitos: z.array(codigo).default([]),
  avaliacao: avaliacaoSchema.nullable().default(null),
  antesDeComecar: z.array(texto).default([]),
  etapas: z.array(texto).default([]),
  entrega: z.boolean().default(false),
  opcional: z.boolean().default(false),
});

const seedSchema = z.strictObject({
  versao: z.number().int().positive(),
  trilhas: z.array(
    z.strictObject({ slug: z.enum(slugsTrilha), nome: texto, bloco: z.enum(blocosPlano) }),
  ),
  fases: z.array(z.strictObject({ numero: z.number().int().min(0).max(9), nome: texto })),
  padraoDeEntrega: z.array(texto),
  recrutamento: z.strictObject({
    liberaCom: z.array(codigo),
    checklist: z.array(texto),
    contadores: z.array(
      z.strictObject({ chave: texto, titulo: texto, metaSemanal: z.number().int().positive() }),
    ),
  }),
  itens: z.array(itemSchema),
});

export type Avaliacao = z.infer<typeof avaliacaoSchema>;
export type TrilhaPlano = z.infer<typeof seedSchema>["trilhas"][number];
export type FasePlano = z.infer<typeof seedSchema>["fases"][number];
export type Recrutamento = z.infer<typeof seedSchema>["recrutamento"];

/** Item do catálogo. `posicao` é a ordem dentro da trilha; `ativo` falso some das telas. */
export type ItemPlano = z.infer<typeof itemSchema> & { posicao: number; ativo: boolean };

export type Catalogo = {
  versao: number;
  trilhas: TrilhaPlano[];
  fases: FasePlano[];
  padraoDeEntrega: string[];
  recrutamento: Recrutamento;
  itens: ItemPlano[];
};

/** Lê o seed (forma do plano.json), preenche os padrões e numera as posições por trilha. */
export function lerCatalogo(json: unknown): Catalogo {
  const seed = seedSchema.parse(json);
  const contagem = new Map<string, number>();
  const itens = seed.itens.map((i) => {
    const posicao = contagem.get(i.trilha) ?? 0;
    contagem.set(i.trilha, posicao + 1);
    return { ...i, posicao, ativo: true };
  });
  return { ...seed, itens };
}

/** Texto com travessão, meia risca, " - " ou hífen entre palavras. */
export function temHifenDePontuacao(s: string): boolean {
  return /[—–]/.test(s) || / - /.test(s) || /[\p{L}\p{N}]-[\p{L}\p{N}]/u.test(s);
}

/**
 * Erros do catálogo (lista vazia quando está válido). Confere códigos únicos, trilhas e fases
 * existentes, requisitos que existem, sem ciclos, requisito da mesma trilha antes na ordem, sem
 * trava cruzada (simulando a conclusão), horas positivas, aprovações 1 ou 2 e a escrita.
 */
export function validarCatalogo(cat: Catalogo): string[] {
  const erros: string[] = [];
  const porCodigo = new Map<string, ItemPlano>();
  for (const i of cat.itens) {
    if (porCodigo.has(i.codigo)) erros.push(`Código repetido: ${i.codigo}`);
    porCodigo.set(i.codigo, i);
  }

  const slugs = new Set(cat.trilhas.map((t) => t.slug));
  if (slugs.size !== cat.trilhas.length) erros.push("Trilha repetida");
  const blocos = new Set(cat.trilhas.map((t) => t.bloco));
  if (blocos.size !== cat.trilhas.length) erros.push("Bloco ligado a mais de uma trilha");
  const fases = new Set(cat.fases.map((f) => f.numero));
  if (fases.size !== cat.fases.length) erros.push("Fase repetida");

  for (const i of cat.itens) {
    if (!slugs.has(i.trilha)) erros.push(`${i.codigo}: trilha desconhecida ${i.trilha}`);
    if (i.trilha === "teoria") {
      if (i.fase === undefined) erros.push(`${i.codigo}: item da Teoria sem fase`);
      else if (!fases.has(i.fase)) erros.push(`${i.codigo}: fase desconhecida ${i.fase}`);
    } else if (i.fase !== undefined) {
      erros.push(`${i.codigo}: só itens da Teoria têm fase`);
    }
    if (!(i.horas > 0)) erros.push(`${i.codigo}: horas precisam ser maiores que zero`);
    if (i.avaliacao?.tipo === "nota" && ![1, 2].includes(i.avaliacao.aprovacoes)) {
      erros.push(`${i.codigo}: aprovações precisam ser 1 ou 2`);
    }
    if (i.entrega && cat.padraoDeEntrega.length === 0) {
      erros.push(`${i.codigo}: item de entrega sem padrão de entrega`);
    }
    for (const r of i.requisitos) {
      const req = porCodigo.get(r);
      if (!req) erros.push(`${i.codigo}: requisito desconhecido ${r}`);
      else if (req.trilha === i.trilha && req.posicao >= i.posicao) {
        erros.push(`${i.codigo}: requisito ${r} da mesma trilha vem depois na ordem`);
      }
    }
  }
  for (const r of cat.recrutamento.liberaCom) {
    if (!porCodigo.has(r)) erros.push(`Recrutamento: requisito desconhecido ${r}`);
  }

  for (const s of textosDoCatalogo(cat)) {
    if (temHifenDePontuacao(s)) erros.push(`Texto com travessão ou hífen: "${s}"`);
  }

  // Os testes de grafo só fazem sentido com códigos e requisitos consistentes.
  if (erros.length) return erros;

  const ciclo = acharCiclo(cat.itens);
  if (ciclo) return [`Ciclo de requisitos: ${ciclo.join(" > ")}`];

  const presos = simularConclusao(cat);
  if (presos.length) erros.push(`Trava cruzada: nunca liberados ${presos.join(", ")}`);
  return erros;
}

/** Lê e valida; seed inválido lança erro (quebra o build e o deploy). */
export function carregarCatalogo(json: unknown): Catalogo {
  const cat = lerCatalogo(json);
  const erros = validarCatalogo(cat);
  if (erros.length) throw new Error(`plano.json inválido:\n${erros.join("\n")}`);
  return cat;
}

function textosDoCatalogo(cat: Catalogo): string[] {
  return [
    ...cat.trilhas.map((t) => t.nome),
    ...cat.fases.map((f) => f.nome),
    ...cat.padraoDeEntrega,
    ...cat.recrutamento.checklist,
    ...cat.recrutamento.contadores.map((c) => c.titulo),
    ...cat.itens.flatMap((i) => [
      i.titulo,
      i.estudar ?? "",
      i.recurso ?? "",
      i.criterio,
      ...i.antesDeComecar,
      ...i.etapas,
    ]),
  ].filter(Boolean);
}

function acharCiclo(itens: ItemPlano[]): string[] | null {
  const reqs = new Map(itens.map((i) => [i.codigo, i.requisitos]));
  const estado = new Map<string, "visitando" | "feito">();
  const pilha: string[] = [];
  const visitar = (c: string): string[] | null => {
    const e = estado.get(c);
    if (e === "feito") return null;
    if (e === "visitando") return [...pilha.slice(pilha.indexOf(c)), c];
    estado.set(c, "visitando");
    pilha.push(c);
    for (const r of reqs.get(c) ?? []) {
      const ciclo = visitar(r);
      if (ciclo) return ciclo;
    }
    pilha.pop();
    estado.set(c, "feito");
    return null;
  };
  for (const i of itens) {
    const ciclo = visitar(i.codigo);
    if (ciclo) return ciclo;
  }
  return null;
}

/** Conclui, a cada passo, todo item atual disponível. Devolve os itens ativos que sobraram. */
function simularConclusao(cat: Catalogo): string[] {
  const feitos = new Set<string>();
  for (let mudou = true; mudou;) {
    mudou = false;
    for (const t of cat.trilhas) {
      const e = estadoTrilha(cat, t.slug, feitos);
      if (e.atual && e.estado === "disponivel") {
        feitos.add(e.atual.codigo);
        mudou = true;
      }
    }
  }
  return ativos(cat)
    .filter((i) => !feitos.has(i.codigo))
    .map((i) => i.codigo);
}

// ---------------------------------------------------------------------------------------------
// Estado das trilhas

export type Concluidos = ReadonlySet<string>;
export type Pendente = { codigo: string; titulo: string };
export type EstadoItem = "concluido" | "disponivel" | "aguardando" | "bloqueado";

const ativos = (cat: Catalogo) => cat.itens.filter((i) => i.ativo);

export const itensDaTrilha = (cat: Catalogo, trilha: SlugTrilha) =>
  ativos(cat)
    .filter((i) => i.trilha === trilha)
    .sort((a, b) => a.posicao - b.posicao);

export const itemPorCodigo = (cat: Catalogo, c: string) =>
  cat.itens.find((i) => i.codigo === c) ?? null;

export const trilhaDoBloco = (cat: Catalogo, bloco: BlocoPlano) =>
  cat.trilhas.find((t) => t.bloco === bloco)?.slug ?? null;

/** "A3. Cálculo de várias variáveis". */
export const rotulo = (i: Pick<ItemPlano, "codigo" | "titulo">) => `${i.codigo}. ${i.titulo}`;

/**
 * Requisitos ainda não concluídos, na ordem do item. Um requisito inativo (que saiu do seed) não
 * trava ninguém.
 */
export function requisitosPendentes(
  cat: Catalogo,
  item: ItemPlano,
  feitos: Concluidos,
): Pendente[] {
  return item.requisitos
    .map((r) => itemPorCodigo(cat, r))
    .filter((r): r is ItemPlano => !!r && r.ativo && !feitos.has(r.codigo))
    .map((r) => ({ codigo: r.codigo, titulo: r.titulo }));
}

export type EstadoTrilha = {
  trilha: SlugTrilha;
  /** Primeiro item ativo não concluído; nulo quando a trilha terminou. */
  atual: ItemPlano | null;
  estado: "disponivel" | "aguardando" | "concluida";
  pendentes: Pendente[];
  /** Os itens depois do atual (estado bloqueado). */
  seguintes: ItemPlano[];
  concluidos: ItemPlano[];
};

export function estadoTrilha(cat: Catalogo, trilha: SlugTrilha, feitos: Concluidos): EstadoTrilha {
  const itens = itensDaTrilha(cat, trilha);
  const idx = itens.findIndex((i) => !feitos.has(i.codigo));
  const concluidos = itens.filter((i) => feitos.has(i.codigo));
  if (idx < 0) {
    return { trilha, atual: null, estado: "concluida", pendentes: [], seguintes: [], concluidos };
  }
  const atual = itens[idx];
  const pendentes = requisitosPendentes(cat, atual, feitos);
  return {
    trilha,
    atual,
    estado: pendentes.length ? "aguardando" : "disponivel",
    pendentes,
    seguintes: itens.slice(idx + 1).filter((i) => !feitos.has(i.codigo)),
    concluidos,
  };
}

export function estadoDoItem(cat: Catalogo, c: string, feitos: Concluidos): EstadoItem | null {
  const item = itemPorCodigo(cat, c);
  if (!item || !item.ativo) return null;
  if (feitos.has(c)) return "concluido";
  const t = estadoTrilha(cat, item.trilha, feitos);
  if (t.atual?.codigo !== c) return "bloqueado";
  return t.estado === "disponivel" ? "disponivel" : "aguardando";
}

/** Itens atuais disponíveis, um por trilha no máximo, na ordem das trilhas. */
export function atuaisDisponiveis(cat: Catalogo, feitos: Concluidos): ItemPlano[] {
  return cat.trilhas
    .map((t) => estadoTrilha(cat, t.slug, feitos))
    .filter((e) => e.estado === "disponivel" && e.atual)
    .map((e) => e.atual!);
}

// ---------------------------------------------------------------------------------------------
// Avaliação e conclusão

export const notaValida = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;

export const tentativaAprovada = (avaliacao: Avaliacao | null, nota: number) =>
  avaliacao?.tipo === "nota" && nota >= avaliacao.minima;

/** "Tentativa registrada: 72%. Para passar, 80% ou mais." */
export function mensagemTentativa(item: ItemPlano, nota: number, aprovacoes: number): string {
  const a = item.avaliacao;
  if (a?.tipo !== "nota") return `Tentativa registrada: ${nota}%.`;
  if (nota < a.minima) return `Tentativa registrada: ${nota}%. Para passar, ${a.minima}% ou mais.`;
  if (aprovacoes < a.aprovacoes) {
    return `Tentativa aprovada: ${nota}%. Aprovações: ${aprovacoes} de ${a.aprovacoes}.`;
  }
  return `Tentativa aprovada: ${nota}%.`;
}

export type Tentativa = { nota: number; aprovada: boolean };

export type PedidoConclusao = {
  feitos: Concluidos;
  /** Índices marcados no checklist "Antes de começar". */
  antes: readonly number[];
  /** Índices marcados no checklist do padrão de entrega. */
  entrega: readonly number[];
  tentativas: readonly Tentativa[];
  /** Nos itens com avaliação de aprovação: confirmei que fui aprovado. */
  aprovado?: boolean;
};

export type MotivoRecusa =
  | "inexistente"
  | "concluido"
  | "nao_e_atual"
  | "requisito_pendente"
  | "antes_de_comecar"
  | "entrega_incompleta"
  | "nota_insuficiente"
  | "aprovacao_nao_confirmada";

export type Verificacao =
  { ok: true } | { ok: false; motivo: MotivoRecusa; mensagem: string; pendentes?: Pendente[] };

const recusa = (motivo: MotivoRecusa, mensagem: string, pendentes?: Pendente[]): Verificacao => ({
  ok: false,
  motivo,
  mensagem,
  ...(pendentes ? { pendentes } : {}),
});

const todosMarcados = (total: number, marcados: readonly number[]) => {
  const s = new Set(marcados);
  return Array.from({ length: total }, (_, i) => i).every((i) => s.has(i));
};

/** Regra 3: só o item atual, disponível, com os checklists e a avaliação cumpridos. */
export function verificarConclusao(cat: Catalogo, c: string, p: PedidoConclusao): Verificacao {
  const item = itemPorCodigo(cat, c);
  if (!item || !item.ativo) return recusa("inexistente", "Conteúdo não encontrado.");
  if (p.feitos.has(c)) return recusa("concluido", `${rotulo(item)} já está concluído.`);
  const t = estadoTrilha(cat, item.trilha, p.feitos);
  if (t.atual?.codigo !== c) {
    return recusa(
      "nao_e_atual",
      `Só o conteúdo atual da trilha pode ser concluído: ${rotulo(t.atual!)}.`,
    );
  }
  if (t.estado !== "disponivel") {
    return recusa(
      "requisito_pendente",
      `Aguardando: ${t.pendentes.map(rotulo).join(", ")}.`,
      t.pendentes,
    );
  }
  if (!todosMarcados(item.antesDeComecar.length, p.antes)) {
    return recusa("antes_de_comecar", "Marque o checklist Antes de começar.");
  }
  if (item.entrega && !todosMarcados(cat.padraoDeEntrega.length, p.entrega)) {
    return recusa("entrega_incompleta", "Complete o checklist do padrão de entrega.");
  }
  const a = item.avaliacao;
  if (a?.tipo === "nota") {
    const aprovadas = p.tentativas.filter((x) => x.aprovada && x.nota >= a.minima).length;
    if (aprovadas < a.aprovacoes) {
      const falta =
        a.aprovacoes > 1
          ? `Para concluir, ${a.aprovacoes} tentativas com ${a.minima}% ou mais. Aprovações: ${aprovadas} de ${a.aprovacoes}.`
          : `Para concluir, uma tentativa com ${a.minima}% ou mais.`;
      return recusa("nota_insuficiente", falta);
    }
  }
  if (a?.tipo === "aprovacao" && !p.aprovado) {
    return recusa("aprovacao_nao_confirmada", "Confirme que você foi aprovado.");
  }
  return { ok: true };
}

export type Liberacao = {
  /** Novo item atual da trilha do item concluído (nulo quando ela terminou). */
  proximo: { item: ItemPlano; estado: "disponivel" | "aguardando"; pendentes: Pendente[] } | null;
  /** Itens atuais de outras trilhas que estavam aguardando e ficaram disponíveis. */
  tambem: ItemPlano[];
};

/** O que a conclusão de `c` libera, comparando o estado antes e depois. */
export function liberadosApos(cat: Catalogo, feitosAntes: Concluidos, c: string): Liberacao {
  const item = itemPorCodigo(cat, c);
  if (!item) return { proximo: null, tambem: [] };
  const depois = new Set(feitosAntes).add(c);
  const t = estadoTrilha(cat, item.trilha, depois);
  const proximo =
    t.atual && t.estado !== "concluida"
      ? { item: t.atual, estado: t.estado, pendentes: t.pendentes }
      : null;
  const tambem = cat.trilhas
    .filter((x) => x.slug !== item.trilha)
    .flatMap((x) => {
      const antes = estadoTrilha(cat, x.slug, feitosAntes);
      const agora = estadoTrilha(cat, x.slug, depois);
      return antes.estado === "aguardando" && agora.estado === "disponivel" && agora.atual
        ? [agora.atual]
        : [];
    });
  return { proximo, tambem };
}

/** Linhas da mensagem depois de concluir. */
export function textoLiberacao(cat: Catalogo, l: Liberacao): string[] {
  const linhas: string[] = [];
  if (!l.proximo) linhas.push("Trilha concluída.");
  else if (l.proximo.estado === "disponivel") {
    linhas.push(`Próximo conteúdo liberado: ${rotulo(l.proximo.item)}`);
  } else {
    linhas.push(
      `Próximo conteúdo: ${rotulo(l.proximo.item)}. Aguardando: ${l.proximo.pendentes.map(rotulo).join(", ")}`,
    );
  }
  for (const i of l.tambem) {
    const nome = cat.trilhas.find((t) => t.slug === i.trilha)?.nome ?? i.trilha;
    linhas.push(`Também liberado: ${i.codigo} na trilha ${nome}`);
  }
  return linhas;
}

// ---------------------------------------------------------------------------------------------
// Desfazer

export type Conclusao = { codigo: string; em: string };

/** A conclusão mais recente de cada trilha (empate: a que vem depois na ordem). */
function maisRecenteDaTrilha(cat: Catalogo, trilha: SlugTrilha, conclusoes: readonly Conclusao[]) {
  let melhor: { item: ItemPlano; em: string } | null = null;
  for (const c of conclusoes) {
    const item = itemPorCodigo(cat, c.codigo);
    if (!item || !item.ativo || item.trilha !== trilha) continue;
    if (!melhor || c.em > melhor.em || (c.em === melhor.em && item.posicao > melhor.item.posicao)) {
      melhor = { item, em: c.em };
    }
  }
  return melhor?.item ?? null;
}

export type VerificacaoDesfazer =
  | { ok: true }
  | {
      ok: false;
      motivo: "nao_concluido" | "nao_e_mais_recente" | "dependente_concluido";
      mensagem: string;
      impede?: Pendente;
    };

/** Regra 4: só a conclusão mais recente da trilha, e sem dependente concluído. */
export function verificarDesfazer(
  cat: Catalogo,
  c: string,
  conclusoes: readonly Conclusao[],
): VerificacaoDesfazer {
  const item = itemPorCodigo(cat, c);
  if (!item || !conclusoes.some((x) => x.codigo === c)) {
    return { ok: false, motivo: "nao_concluido", mensagem: "Este conteúdo não está concluído." };
  }
  const recente = maisRecenteDaTrilha(cat, item.trilha, conclusoes);
  if (recente && recente.codigo !== c) {
    return {
      ok: false,
      motivo: "nao_e_mais_recente",
      mensagem: `Só a conclusão mais recente da trilha pode ser desfeita: ${rotulo(recente)}.`,
      impede: { codigo: recente.codigo, titulo: recente.titulo },
    };
  }
  const feitos = new Set(conclusoes.map((x) => x.codigo));
  const dependente = ativos(cat).find((i) => feitos.has(i.codigo) && i.requisitos.includes(c));
  if (dependente) {
    return {
      ok: false,
      motivo: "dependente_concluido",
      mensagem: `Não dá para desfazer: ${rotulo(dependente)} depende deste conteúdo.`,
      impede: { codigo: dependente.codigo, titulo: dependente.titulo },
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Blocos do dia

export type Escolha = { tipo: "item"; codigo: string } | { tipo: "cards" };

/** `item:<codigo>` ou `cards`; qualquer outra coisa é nula. */
export function lerEscolha(s: string | null | undefined): Escolha | null {
  if (s === "cards") return { tipo: "cards" };
  const m = s?.match(/^item:(.+)$/);
  return m ? { tipo: "item", codigo: m[1] } : null;
}

export const gravarEscolha = (e: Escolha) => (e.tipo === "cards" ? "cards" : `item:${e.codigo}`);

export type ConteudoBloco = {
  conteudo: Escolha;
  /** Item do conteúdo (nulo em Cards e Cerebro). */
  item: ItemPlano | null;
  origem: "troca" | "trilha" | "plano_b";
  /** Por que o bloco não está na própria trilha. */
  motivo:
    { tipo: "aguardando"; item: ItemPlano; pendentes: Pendente[] } | { tipo: "concluida" } | null;
};

export type DiaDoBloco = {
  feitos: Concluidos;
  /** Troca manual gravada para este dia e bloco (coluna `escolha`). */
  troca?: string | null;
  /** Códigos estudados em qualquer bloco do dia (`codigo_estudado`). */
  estudadosHoje?: readonly string[];
};

/** Regra 5: troca do dia, senão o atual da trilha do bloco, senão o plano B. */
export function conteudoDoBloco(cat: Catalogo, bloco: BlocoPlano, dia: DiaDoBloco): ConteudoBloco {
  const trilha = trilhaDoBloco(cat, bloco);
  const troca = lerEscolha(dia.troca);
  if (troca) {
    const item = troca.tipo === "item" ? itemPorCodigo(cat, troca.codigo) : null;
    if (troca.tipo === "cards" || item)
      return { conteudo: troca, item, origem: "troca", motivo: null };
  }

  const propria = trilha ? estadoTrilha(cat, trilha, dia.feitos) : null;
  if (propria?.atual && propria.estado === "disponivel") {
    const item = propria.atual;
    return {
      conteudo: { tipo: "item", codigo: item.codigo },
      item,
      origem: "trilha",
      motivo: null,
    };
  }
  const motivo: ConteudoBloco["motivo"] =
    propria?.atual && propria.estado === "aguardando"
      ? { tipo: "aguardando", item: propria.atual, pendentes: propria.pendentes }
      : { tipo: "concluida" };

  const estudados = new Set(dia.estudadosHoje ?? []);
  const teoriaEstudada = itensDaTrilha(cat, "teoria").some((i) => estudados.has(i.codigo));
  for (const t of ["teoria", "cursos"] as const) {
    if (t === trilha || (t === "teoria" && teoriaEstudada)) continue;
    const e = estadoTrilha(cat, t, dia.feitos);
    if (e.atual && e.estado === "disponivel") {
      return {
        conteudo: { tipo: "item", codigo: e.atual.codigo },
        item: e.atual,
        origem: "plano_b",
        motivo,
      };
    }
  }
  return { conteudo: { tipo: "cards" }, item: null, origem: "plano_b", motivo };
}

export const CARDS_E_CEREBRO = "Cards e Cerebro";

/** "Aguardando: A6. Prova da Fase 1. Plano B: B1. Building with the Claude API". */
export function textoBloco(b: ConteudoBloco): string {
  const conteudo = b.item ? rotulo(b.item) : CARDS_E_CEREBRO;
  if (b.origem !== "plano_b") return conteudo;
  const porque =
    b.motivo?.tipo === "aguardando" ? `Aguardando: ${rotulo(b.motivo.item)}.` : "Trilha concluída.";
  return `${porque} Plano B: ${conteudo}`;
}

/** Regra 6: opções de troca de um bloco. */
export function opcoesDeTroca(cat: Catalogo, feitos: Concluidos): Escolha[] {
  return [
    ...atuaisDisponiveis(cat, feitos).map((i) => ({ tipo: "item" as const, codigo: i.codigo })),
    { tipo: "cards" },
  ];
}

export type VerificacaoTroca =
  | { ok: true }
  | {
      ok: false;
      motivo: "inexistente" | "concluido" | "aguardando" | "bloqueado";
      mensagem: string;
    };

/** Troca só para um item atual disponível de qualquer trilha, ou Cards e Cerebro. */
export function verificarTroca(cat: Catalogo, e: Escolha, feitos: Concluidos): VerificacaoTroca {
  if (e.tipo === "cards") return { ok: true };
  const estado = estadoDoItem(cat, e.codigo, feitos);
  switch (estado) {
    case "disponivel":
      return { ok: true };
    case null:
      return { ok: false, motivo: "inexistente", mensagem: "Conteúdo não encontrado." };
    case "concluido":
      return { ok: false, motivo: "concluido", mensagem: "Este conteúdo já está concluído." };
    case "aguardando":
      return {
        ok: false,
        motivo: "aguardando",
        mensagem: "Este conteúdo ainda aguarda requisitos.",
      };
    case "bloqueado":
      return { ok: false, motivo: "bloqueado", mensagem: "Este conteúdo ainda não foi liberado." };
  }
}

// ---------------------------------------------------------------------------------------------
// Blocos do dia: quais existem, a que horas, por quanto tempo e com que conteúdo

export const ROTULO_BLOCO: Record<BlocoPlano, string> = {
  manha: "Manhã",
  teoria: "Teoria",
  projeto: "Projeto",
};

/** Início padrão de cada bloco quando Ajustes não define. */
export const INICIO_PADRAO_BLOCO: Record<BlocoPlano, string> = {
  manha: "08:00",
  teoria: "13:30",
  projeto: "17:20",
};

/** Folga que abre o bloco da manhã, em minutos. */
export const FOLGA_MINIMA = 60;
export const FOLGA_MAXIMA = 180;

/** A pergunta da folga some ao meio-dia se ainda não foi respondida. */
const LIMITE_DA_PERGUNTA_MIN = 12 * 60;

export type TipoDeDia = keyof BlocosPlanoAjustes;

export function tipoDeDia(data: string): TipoDeDia {
  const dia = diaDaSemana(data);
  return dia === 0 ? "domingo" : dia === 6 ? "sabado" : "dias_uteis";
}

export const ehDiaUtil = (data: string) => tipoDeDia(data) === "dias_uteis";

export type BlocoAgendado = { bloco: BlocoPlano; inicio: string; minutos: number };

/**
 * Blocos que existem num dia, em ordem de horário. Dia útil: Teoria e Projeto sempre (salvo
 * `ligado: false`) e a manhã só com folga de 60 a 180 minutos, que também dá a duração. Fim de
 * semana: só o que Ajustes liga.
 */
export function blocosDoDia(
  data: string,
  ajustes: BlocosPlanoAjustes | null | undefined,
  folga: number | null,
): BlocoAgendado[] {
  const tipo = tipoDeDia(data);
  const util = tipo === "dias_uteis";
  const saida: BlocoAgendado[] = [];
  for (const bloco of blocosPlano) {
    const config = ajustes?.[tipo]?.[bloco];
    if (bloco === "manha" && util) {
      if (folga == null || folga < FOLGA_MINIMA || folga > FOLGA_MAXIMA) continue;
      if (config?.ligado === false) continue;
      saida.push({ bloco, inicio: config?.inicio ?? INICIO_PADRAO_BLOCO.manha, minutos: folga });
      continue;
    }
    if (util ? config?.ligado === false : config?.ligado !== true) continue;
    saida.push({
      bloco,
      inicio: config?.inicio ?? INICIO_PADRAO_BLOCO[bloco],
      minutos: config?.minutos ?? MINUTOS_PADRAO_BLOCO[bloco],
    });
  }
  return saida.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

/** O agendamento do bloco no dia, ou nulo se ele não existe naquele dia. */
export const blocoAgendado = (
  data: string,
  bloco: BlocoPlano,
  ajustes: BlocosPlanoAjustes | null | undefined,
  folga: number | null,
) => blocosDoDia(data, ajustes, folga).find((b) => b.bloco === bloco) ?? null;

/** Duração do bloco: a agendada no dia, senão Ajustes, a folga (manhã) ou o padrão. */
export function minutosDoBloco(
  data: string,
  bloco: BlocoPlano,
  ajustes: BlocosPlanoAjustes | null | undefined,
  folga: number | null,
) {
  const agendado = blocoAgendado(data, bloco, ajustes, folga);
  if (agendado) return agendado.minutos;
  const configurado = ajustes?.[tipoDeDia(data)]?.[bloco]?.minutos;
  return configurado ?? (bloco === "manha" && folga ? folga : MINUTOS_PADRAO_BLOCO[bloco]);
}

/** "Hoje tem folga no estágio?": dia útil, até a resposta ou até 12:00 no fuso do usuário. */
export function perguntaDaFolgaAberta(data: string, folga: number | null, minutosLocais: number) {
  return ehDiaUtil(data) && (folga != null || minutosLocais < LIMITE_DA_PERGUNTA_MIN);
}

/** "Bloco Teoria: A2. Cálculo de uma variável": título na Agenda e no calendário. */
export const tituloDoBloco = (bloco: BlocoPlano, texto: string) =>
  `Bloco ${ROTULO_BLOCO[bloco]}: ${texto}`;

/** Linha de `plano_blocos` como a montagem dos blocos precisa. */
export type RegistroDoBloco = {
  data: string;
  bloco: string;
  escolha: string | null;
  codigoEstudado: string | null;
  minutos: number;
  feitoEm: Date | null;
};

/** Códigos estudados no dia em blocos já marcados como feitos, sem contar o próprio bloco. */
export function estudadosNoDia(
  registros: readonly RegistroDoBloco[],
  data: string,
  exceto: string,
): string[] {
  return registros
    .filter((r) => r.data === data && r.bloco !== exceto && r.feitoEm && r.codigoEstudado)
    .map((r) => r.codigoEstudado!);
}

export type BlocoMontado = BlocoAgendado & {
  data: string;
  conteudo: ConteudoBloco;
  /** "A2. Cálculo de uma variável" ou "Aguardando: X. Plano B: Y". */
  texto: string;
  titulo: string;
  feito: boolean;
  /** Minutos registrados no bloco feito; nulo enquanto não foi feito. */
  minutosFeitos: number | null;
};

/**
 * Os blocos de cada dia do intervalo (inclusivo) com o conteúdo resolvido. Bloco feito mostra o
 * que foi estudado; o do dia mostra a troca gravada; os demais, o conteúdo atual do plano.
 */
export function montarBlocos(entrada: {
  cat: Catalogo;
  feitos: Concluidos;
  ajustes: BlocosPlanoAjustes | null | undefined;
  intervalo: { de: string; ate: string };
  folgas: ReadonlyMap<string, number>;
  registros: readonly RegistroDoBloco[];
}): BlocoMontado[] {
  const { cat, feitos, ajustes, intervalo, folgas, registros } = entrada;
  const saida: BlocoMontado[] = [];
  for (let data = intervalo.de; data <= intervalo.ate; data = addDias(data, 1)) {
    for (const agendado of blocosDoDia(data, ajustes, folgas.get(data) ?? null)) {
      const registro = registros.find((r) => r.data === data && r.bloco === agendado.bloco);
      const feito = !!registro?.feitoEm;
      const estudado = registro?.codigoEstudado ? `item:${registro.codigoEstudado}` : "cards";
      const conteudo = conteudoDoBloco(cat, agendado.bloco, {
        feitos,
        troca: feito ? estudado : registro?.escolha,
        estudadosHoje: estudadosNoDia(registros, data, agendado.bloco),
      });
      const texto = textoBloco(conteudo);
      saida.push({
        ...agendado,
        data,
        conteudo,
        texto,
        titulo: tituloDoBloco(agendado.bloco, texto),
        feito,
        minutosFeitos: feito ? registro!.minutos : null,
      });
    }
  }
  return saida;
}

// ---------------------------------------------------------------------------------------------
// Horas, progresso e recrutamento

const somaHoras = (itens: ItemPlano[]) =>
  Math.round(itens.reduce((s, i) => s + i.horas, 0) * 10) / 10;

/** Regra 7: horas estimadas dos itens ativos não concluídos, sem os opcionais. */
export function horasRestantes(
  cat: Catalogo,
  feitos: Concluidos,
  filtro: { trilha?: SlugTrilha; fase?: number } = {},
): number {
  return somaHoras(
    ativos(cat).filter(
      (i) =>
        !i.opcional &&
        !feitos.has(i.codigo) &&
        (filtro.trilha === undefined || i.trilha === filtro.trilha) &&
        (filtro.fase === undefined || i.fase === filtro.fase),
    ),
  );
}

/** Horas gastas num item: soma dos minutos dos blocos registrados com ele. */
export function horasGastas(
  blocos: readonly { codigo: string | null; minutos: number }[],
  c: string,
): number {
  const min = blocos.filter((b) => b.codigo === c).reduce((s, b) => s + b.minutos, 0);
  return Math.round((min / 60) * 10) / 10;
}

/** 6 → "6 h", 1.5 → "1,5 h". */
export const formatarHoras = (h: number) =>
  `${String(Math.round(h * 10) / 10).replace(".", ",")} h`;

/** "6 h gastas de 15 h estimadas". */
export const textoHoras = (gastas: number, estimadas: number) =>
  `${formatarHoras(gastas)} gastas de ${formatarHoras(estimadas)} estimadas`;

/** Itens concluídos de total, sem os opcionais (a barra de progresso da trilha). */
export function progressoTrilha(cat: Catalogo, trilha: SlugTrilha, feitos: Concluidos) {
  const itens = itensDaTrilha(cat, trilha).filter((i) => !i.opcional);
  return { concluidos: itens.filter((i) => feitos.has(i.codigo)).length, total: itens.length };
}

/** Regra 9: recrutamento liberado quando os requisitos dele (B5 e C8) estão concluídos. */
export const recrutamentoLiberado = (cat: Catalogo, feitos: Concluidos) =>
  cat.recrutamento.liberaCom.every((c) => feitos.has(c));

// ---------------------------------------------------------------------------------------------
// Primeira abertura

/**
 * Requisitos (transitivos) dos itens marcados que não foram marcados, na ordem do catálogo. A tela
 * pergunta se marca junto.
 */
export function requisitosNaoMarcados(cat: Catalogo, marcados: Iterable<string>): Pendente[] {
  const marc = new Set(marcados);
  const todos = fechamento(cat, marc);
  return ativos(cat)
    .filter((i) => !marc.has(i.codigo) && todos.has(i.codigo))
    .map((i) => ({ codigo: i.codigo, titulo: i.titulo }));
}

/** Os marcados mais todos os requisitos deles, transitivamente. */
export function fechamento(cat: Catalogo, marcados: Iterable<string>): Set<string> {
  const todos = new Set<string>();
  const fila = [...marcados];
  while (fila.length) {
    const c = fila.pop()!;
    if (todos.has(c)) continue;
    const item = itemPorCodigo(cat, c);
    if (!item || !item.ativo) continue;
    todos.add(c);
    fila.push(...item.requisitos);
  }
  return todos;
}
