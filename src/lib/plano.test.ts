import { describe, expect, it } from "vitest";
import seed from "@/server/plano/plano.json";
import {
  carregarCatalogo,
  conteudoDoBloco,
  estadoDoItem,
  estadoTrilha,
  fechamento,
  horasGastas,
  horasRestantes,
  lerCatalogo,
  lerEscolha,
  liberadosApos,
  mensagemTentativa,
  opcoesDeTroca,
  progressoTrilha,
  recrutamentoLiberado,
  requisitosNaoMarcados,
  textoBloco,
  textoHoras,
  textoLiberacao,
  validarCatalogo,
  verificarConclusao,
  verificarDesfazer,
  verificarTroca,
  type Catalogo,
  type PedidoConclusao,
} from "./plano";

const cat = carregarCatalogo(seed);
const feitos = (...c: string[]) => new Set(c);
const item = (c: string) => cat.itens.find((i) => i.codigo === c)!;

/** Todos os itens da trilha até `codigo`, inclusive. */
const ate = (c: string) => {
  const alvo = item(c);
  return cat.itens
    .filter((i) => i.trilha === alvo.trilha && i.posicao <= alvo.posicao)
    .map((i) => i.codigo);
};

const pedido = (p: Partial<PedidoConclusao> & { feitos: Set<string> }): PedidoConclusao => ({
  antes: [],
  entrega: [],
  tentativas: [],
  ...p,
});

/** Seed mínimo válido para os testes de validação. */
const seedBase = () => ({
  versao: 1,
  trilhas: [
    { slug: "teoria", nome: "Teoria", bloco: "teoria" },
    { slug: "cursos", nome: "Cursos", bloco: "manha" },
  ],
  fases: [{ numero: 0, nome: "Base" }],
  padraoDeEntrega: ["README"],
  recrutamento: { liberaCom: ["B1"], checklist: ["LinkedIn"], contadores: [] },
  itens: [
    { codigo: "A0", trilha: "teoria", fase: 0, titulo: "Um", criterio: "Feito.", horas: 1 },
    { codigo: "A1", trilha: "teoria", fase: 0, titulo: "Dois", criterio: "Feito.", horas: 1 },
    { codigo: "B1", trilha: "cursos", titulo: "Três", criterio: "Feito.", horas: 1 },
  ] as Record<string, unknown>[],
});
const errosDe = (s: ReturnType<typeof seedBase>) => validarCatalogo(lerCatalogo(s));

describe("seed real", () => {
  it("é válido e tem as três trilhas", () => {
    expect(validarCatalogo(cat)).toEqual([]);
    expect(cat.trilhas.map((t) => t.slug)).toEqual(["teoria", "cursos", "projetos"]);
  });

  it("preenche os padrões dos campos omitidos", () => {
    const a0 = item("A0");
    expect(a0.requisitos).toEqual([]);
    expect(a0.avaliacao).toBeNull();
    expect(a0.antesDeComecar).toEqual([]);
    expect(a0.entrega).toBe(false);
    expect(item("B4").avaliacao).toEqual({ tipo: "nota", minima: 80, aprovacoes: 2 });
    expect(item("A2").avaliacao).toEqual({ tipo: "nota", minima: 80, aprovacoes: 1 });
  });

  it("começa em A0, B1 e C1 sem nada concluído", () => {
    const atuais = cat.trilhas.map((t) => estadoTrilha(cat, t.slug, feitos()).atual?.codigo);
    expect(atuais).toEqual(["A0", "B1", "C1"]);
  });

  it("com A0 e C1 concluídos, os atuais são A1, B1 e C2", () => {
    const f = feitos("A0", "C1");
    const atuais = cat.trilhas.map((t) => estadoTrilha(cat, t.slug, f));
    expect(atuais.map((e) => e.atual?.codigo)).toEqual(["A1", "B1", "C2"]);
    expect(atuais.map((e) => e.estado)).toEqual(["disponivel", "disponivel", "disponivel"]);
  });

  it("B11 vem antes de B10 e as Fases 7 e 8 antes das 5 e 6", () => {
    const cursos = cat.itens.filter((i) => i.trilha === "cursos").map((i) => i.codigo);
    expect(cursos.indexOf("B11")).toBeLessThan(cursos.indexOf("B10"));
    expect(cat.fases.map((f) => f.numero)).toEqual([0, 1, 2, 3, 4, 7, 8, 5, 6, 9]);
  });
});

describe("estado do item", () => {
  it("atual disponível, seguintes bloqueados", () => {
    const e = estadoTrilha(cat, "teoria", feitos("A0"));
    expect(e.atual?.codigo).toBe("A1");
    expect(e.estado).toBe("disponivel");
    expect(e.seguintes[0].codigo).toBe("A2");
    expect(estadoDoItem(cat, "A2", feitos("A0"))).toBe("bloqueado");
    expect(estadoDoItem(cat, "A0", feitos("A0"))).toBe("concluido");
  });

  it("aguardando com a lista certa dos requisitos pendentes", () => {
    // C3 pede A5 e C1. Com a Projetos até C12a e só C1, falta A5.
    const f = feitos(...ate("C12a"));
    const e = estadoTrilha(cat, "projetos", f);
    expect(e.atual?.codigo).toBe("C3");
    expect(e.estado).toBe("aguardando");
    expect(e.pendentes).toEqual([{ codigo: "A5", titulo: "Estatística para ML" }]);
    expect(estadoDoItem(cat, "C3", f)).toBe("aguardando");
  });

  it("item inativo some e não trava quem dependia dele", () => {
    const c: Catalogo = {
      ...cat,
      itens: cat.itens.map((i) => (i.codigo === "A0" ? { ...i, ativo: false } : i)),
    };
    expect(estadoTrilha(cat, "teoria", feitos()).atual?.codigo).toBe("A0");
    expect(estadoTrilha(c, "teoria", feitos()).atual?.codigo).toBe("A1");
    expect(estadoDoItem(c, "A0", feitos())).toBeNull();
  });
});

describe("concluir", () => {
  it("aceita o item atual disponível sem avaliação", () => {
    expect(verificarConclusao(cat, "A1", pedido({ feitos: feitos("A0") }))).toEqual({ ok: true });
  });

  it("recusa item que não é o atual", () => {
    const r = verificarConclusao(cat, "A2", pedido({ feitos: feitos("A0") }));
    expect(r).toMatchObject({ ok: false, motivo: "nao_e_atual" });
  });

  it("recusa item já concluído", () => {
    const r = verificarConclusao(cat, "A0", pedido({ feitos: feitos("A0") }));
    expect(r).toMatchObject({ ok: false, motivo: "concluido" });
  });

  it("recusa com requisito pendente", () => {
    const r = verificarConclusao(cat, "C3", pedido({ feitos: feitos(...ate("C12a")) }));
    expect(r).toMatchObject({ ok: false, motivo: "requisito_pendente" });
    if (!r.ok) expect(r.pendentes?.map((p) => p.codigo)).toEqual(["A5"]);
  });

  it("nota 79 com mínima 80 recusa; 80 aceita", () => {
    const f = feitos("A0", "A1");
    const r = verificarConclusao(
      cat,
      "A2",
      pedido({ feitos: f, tentativas: [{ nota: 79, aprovada: false }] }),
    );
    expect(r).toMatchObject({ ok: false, motivo: "nota_insuficiente" });
    const ok = verificarConclusao(
      cat,
      "A2",
      pedido({ feitos: f, tentativas: [{ nota: 80, aprovada: true }] }),
    );
    expect(ok).toEqual({ ok: true });
  });

  it("simulado com uma aprovação só recusa; duas aceitam", () => {
    const f = feitos("B1", "B2", "B3");
    const uma = [
      { nota: 90, aprovada: true },
      { nota: 70, aprovada: false },
    ];
    const r = verificarConclusao(cat, "B4", pedido({ feitos: f, tentativas: uma }));
    expect(r).toMatchObject({ ok: false, motivo: "nota_insuficiente" });
    const duas = [...uma, { nota: 85, aprovada: true }];
    expect(verificarConclusao(cat, "B4", pedido({ feitos: f, tentativas: duas }))).toEqual({
      ok: true,
    });
  });

  it("prova de aprovação pede a confirmação", () => {
    const f = feitos("B1", "B2", "B3", "B4");
    expect(verificarConclusao(cat, "B5", pedido({ feitos: f }))).toMatchObject({
      ok: false,
      motivo: "aprovacao_nao_confirmada",
    });
    expect(verificarConclusao(cat, "B5", pedido({ feitos: f, aprovado: true }))).toEqual({
      ok: true,
    });
  });

  it("entrega com checklist incompleto recusa; completo aceita", () => {
    const f = feitos(...ate("C7"), ...ate("A12"));
    const r = verificarConclusao(cat, "C8", pedido({ feitos: f, entrega: [0, 1, 2] }));
    expect(r).toMatchObject({ ok: false, motivo: "entrega_incompleta" });
    const ok = verificarConclusao(cat, "C8", pedido({ feitos: f, entrega: [0, 1, 2, 3] }));
    expect(ok).toEqual({ ok: true });
  });

  it("B2 sem o antes de começar recusa; marcado aceita", () => {
    const f = feitos("B1");
    expect(verificarConclusao(cat, "B2", pedido({ feitos: f }))).toMatchObject({
      ok: false,
      motivo: "antes_de_comecar",
    });
    expect(verificarConclusao(cat, "B2", pedido({ feitos: f, antes: [0] }))).toEqual({ ok: true });
  });

  it("as etapas não travam (C2)", () => {
    expect(verificarConclusao(cat, "C2", pedido({ feitos: feitos("C1") }))).toEqual({ ok: true });
  });

  it("mensagem da tentativa abaixo da mínima", () => {
    expect(mensagemTentativa(item("A2"), 72, 0)).toBe(
      "Tentativa registrada: 72%. Para passar, 80% ou mais.",
    );
    expect(mensagemTentativa(item("B4"), 85, 1)).toBe(
      "Tentativa aprovada: 85%. Aprovações: 1 de 2.",
    );
  });

  it("liberação: próximo da trilha e item de outra trilha que ficou disponível", () => {
    const antes = feitos(...ate("A4"), ...ate("C12a"));
    const l = liberadosApos(cat, antes, "A5");
    expect(l.proximo?.item.codigo).toBe("A6");
    expect(l.tambem.map((i) => i.codigo)).toEqual(["C3"]);
    expect(textoLiberacao(cat, l)).toEqual([
      "Próximo conteúdo liberado: A6. Prova da Fase 1",
      "Também liberado: C3 na trilha Projetos",
    ]);
  });

  it("liberação sem nada novo em outra trilha", () => {
    const l = liberadosApos(cat, feitos("A0", "A1", "A2"), "A3");
    expect(l.proximo?.item.codigo).toBe("A4");
    expect(l.tambem).toEqual([]);
  });
});

describe("desfazer", () => {
  const conclusoes = (...c: [string, string][]) => c.map(([codigo, em]) => ({ codigo, em }));

  it("aceita a conclusão mais recente sem dependente", () => {
    const c = conclusoes(["A0", "2026-11-01T10:00"], ["A1", "2026-11-02T10:00"]);
    expect(verificarDesfazer(cat, "A1", c)).toEqual({ ok: true });
  });

  it("recusa quando não é a mais recente da trilha", () => {
    const c = conclusoes(["A0", "2026-11-01T10:00"], ["A1", "2026-11-02T10:00"]);
    expect(verificarDesfazer(cat, "A0", c)).toMatchObject({
      ok: false,
      motivo: "nao_e_mais_recente",
      impede: { codigo: "A1" },
    });
  });

  it("recusa quando há dependente concluído em outra trilha", () => {
    // B6 pede A8; com B6 concluído, A8 não pode ser desfeito.
    const teoria = ate("A8").map((c, i): [string, string] => [
      c,
      `2026-11-01T10:${String(i).padStart(2, "0")}`,
    ]);
    const cursos = ate("B6").map((c, i): [string, string] => [
      c,
      `2026-11-02T10:${String(i).padStart(2, "0")}`,
    ]);
    const r = verificarDesfazer(cat, "A8", conclusoes(...teoria, ...cursos));
    expect(r).toMatchObject({
      ok: false,
      motivo: "dependente_concluido",
      impede: { codigo: "B6" },
    });
    if (!r.ok) expect(r.mensagem).toContain("B6. LLM Zoomcamp");
  });

  it("recusa o que não está concluído", () => {
    expect(verificarDesfazer(cat, "A1", conclusoes(["A0", "2026-11-01T10:00"]))).toMatchObject({
      ok: false,
      motivo: "nao_concluido",
    });
  });

  it("empate no horário (primeira abertura): a mais recente é a que vem depois na ordem", () => {
    const c = conclusoes(["A0", "2026-11-01T10:00"], ["A1", "2026-11-01T10:00"]);
    expect(verificarDesfazer(cat, "A1", c)).toEqual({ ok: true });
    expect(verificarDesfazer(cat, "A0", c)).toMatchObject({
      ok: false,
      motivo: "nao_e_mais_recente",
    });
  });
});

describe("conteúdo do bloco", () => {
  it("o atual da trilha do bloco quando disponível", () => {
    const b = conteudoDoBloco(cat, "teoria", { feitos: feitos("A0") });
    expect(b).toMatchObject({
      origem: "trilha",
      conteudo: { tipo: "item", codigo: "A1" },
      motivo: null,
    });
    expect(textoBloco(b)).toBe("A1. Álgebra linear");
  });

  it("a troca do dia vale", () => {
    const b = conteudoDoBloco(cat, "teoria", { feitos: feitos("A0"), troca: "item:B1" });
    expect(b).toMatchObject({ origem: "troca", conteudo: { codigo: "B1" } });
    expect(
      conteudoDoBloco(cat, "teoria", { feitos: feitos("A0"), troca: "cards" }).conteudo,
    ).toEqual({
      tipo: "cards",
    });
  });

  // Projetos aguardando em C3 (falta A5), Teoria em A5 e Cursos em B1.
  const aguardandoC3 = feitos(...ate("A4"), ...ate("C12a"));

  it("plano B pula a própria trilha e vai para a Teoria", () => {
    const b = conteudoDoBloco(cat, "projeto", { feitos: aguardandoC3 });
    expect(b).toMatchObject({ origem: "plano_b", conteudo: { codigo: "A5" } });
    expect(b.motivo).toMatchObject({ tipo: "aguardando", item: { codigo: "C3" } });
    expect(textoBloco(b)).toBe(
      "Aguardando: C3. Tutor UPick: TRI parte 1. Plano B: A5. Estatística para ML",
    );
  });

  it("plano B pula a Teoria já estudada no dia e vai para Cursos", () => {
    const b = conteudoDoBloco(cat, "projeto", { feitos: aguardandoC3, estudadosHoje: ["A5"] });
    expect(b).toMatchObject({ origem: "plano_b", conteudo: { codigo: "B1" } });
  });

  it("plano B pula trilha aguardando", () => {
    // Teoria aguardando em A29 (pede B6), Projetos aguardando em C10 (pede A29), Cursos em B2.
    const f = feitos(...ate("A28"), ...ate("C8"), "B1");
    expect(estadoTrilha(cat, "teoria", f)).toMatchObject({
      estado: "aguardando",
      atual: { codigo: "A29" },
    });
    expect(estadoTrilha(cat, "projetos", f)).toMatchObject({
      estado: "aguardando",
      atual: { codigo: "C10" },
    });
    const b = conteudoDoBloco(cat, "projeto", { feitos: f });
    expect(b).toMatchObject({ origem: "plano_b", conteudo: { codigo: "B2" } });
    expect(b.motivo).toMatchObject({ tipo: "aguardando", item: { codigo: "C10" } });
  });

  it("fallback para Cards e Cerebro", () => {
    // Bloco da manhã (Cursos) aguardando em B6 (pede A8), Teoria já estudada no dia.
    const f = feitos(...ate("A7"), ...ate("B5"));
    expect(estadoTrilha(cat, "cursos", f)).toMatchObject({
      estado: "aguardando",
      atual: { codigo: "B6" },
    });
    const b = conteudoDoBloco(cat, "manha", { feitos: f, estudadosHoje: ["A8"] });
    expect(b).toMatchObject({ origem: "plano_b", conteudo: { tipo: "cards" }, item: null });
    expect(textoBloco(b)).toBe(
      "Aguardando: B6. LLM Zoomcamp, módulos de RAG e avaliação de busca. Plano B: Cards e Cerebro",
    );
  });

  it("escolha gravada inválida é ignorada", () => {
    expect(lerEscolha("item:")).toBeNull();
    expect(lerEscolha("qualquer")).toBeNull();
    const b = conteudoDoBloco(cat, "teoria", { feitos: feitos("A0"), troca: "item:ZZ9" });
    expect(b.origem).toBe("trilha");
  });
});

describe("troca manual", () => {
  const f = feitos("A0", "C1");

  it("aceita item atual disponível de qualquer trilha e Cards e Cerebro", () => {
    expect(verificarTroca(cat, { tipo: "item", codigo: "C2" }, f)).toEqual({ ok: true });
    expect(verificarTroca(cat, { tipo: "cards" }, f)).toEqual({ ok: true });
    expect(opcoesDeTroca(cat, f)).toEqual([
      { tipo: "item", codigo: "A1" },
      { tipo: "item", codigo: "B1" },
      { tipo: "item", codigo: "C2" },
      { tipo: "cards" },
    ]);
  });

  it("recusa item bloqueado (futuro na trilha)", () => {
    expect(verificarTroca(cat, { tipo: "item", codigo: "A2" }, f)).toMatchObject({
      ok: false,
      motivo: "bloqueado",
    });
  });

  it("recusa item atual que ainda aguarda requisitos", () => {
    const g = feitos(...ate("C12a"));
    expect(verificarTroca(cat, { tipo: "item", codigo: "C3" }, g)).toMatchObject({
      ok: false,
      motivo: "aguardando",
    });
    expect(opcoesDeTroca(cat, g).some((e) => e.tipo === "item" && e.codigo === "C3")).toBe(false);
  });

  it("recusa concluído e inexistente", () => {
    expect(verificarTroca(cat, { tipo: "item", codigo: "A0" }, f)).toMatchObject({
      motivo: "concluido",
    });
    expect(verificarTroca(cat, { tipo: "item", codigo: "ZZ9" }, f)).toMatchObject({
      motivo: "inexistente",
    });
  });
});

describe("horas, progresso e recrutamento", () => {
  it("horas restantes não contam o opcional", () => {
    const teoria = cat.itens.filter((i) => i.trilha === "teoria");
    const comOpcional = teoria.reduce((s, i) => s + i.horas, 0);
    expect(horasRestantes(cat, feitos(), { trilha: "teoria" })).toBe(comOpcional - 20);
    expect(horasRestantes(cat, feitos(), { trilha: "teoria", fase: 9 })).toBe(0);
  });

  it("horas restantes da fase descontam os concluídos", () => {
    // Fase 1: 6 + 15 + 12 + 12 + 10 + 2 = 57.
    expect(horasRestantes(cat, feitos(), { fase: 1 })).toBe(57);
    expect(horasRestantes(cat, feitos("A1"), { fase: 1 })).toBe(51);
  });

  it("horas gastas somam os blocos do item", () => {
    const blocos = [
      { codigo: "A2", minutos: 90 },
      { codigo: "A2", minutos: 90 },
      { codigo: "B1", minutos: 60 },
      { codigo: null, minutos: 80 },
    ];
    expect(horasGastas(blocos, "A2")).toBe(3);
    expect(textoHoras(horasGastas(blocos, "A2"), item("A2").horas)).toBe(
      "3 h gastas de 15 h estimadas",
    );
    expect(textoHoras(1.5, 10)).toBe("1,5 h gastas de 10 h estimadas");
  });

  it("progresso da trilha sem o opcional e A35 disponível no fim da Teoria", () => {
    const obrigatorios = cat.itens
      .filter((i) => i.trilha === "teoria" && !i.opcional)
      .map((i) => i.codigo);
    const p = progressoTrilha(cat, "teoria", feitos(...obrigatorios));
    expect(p.concluidos).toBe(p.total);
    const e = estadoTrilha(cat, "teoria", feitos(...obrigatorios));
    expect(e).toMatchObject({ estado: "disponivel", atual: { codigo: "A35", opcional: true } });
  });

  it("recrutamento só com B5 e C8", () => {
    expect(recrutamentoLiberado(cat, feitos("B5"))).toBe(false);
    expect(recrutamentoLiberado(cat, feitos("C8"))).toBe(false);
    expect(recrutamentoLiberado(cat, feitos("B5", "C8"))).toBe(true);
  });
});

describe("primeira abertura", () => {
  it("sugestão A0 e C1 não pede nada a mais", () => {
    expect(requisitosNaoMarcados(cat, ["A0", "C1"])).toEqual([]);
  });

  it("fechamento transitivo lista os requisitos não marcados", () => {
    // A5 pede A3 e A4; A3 pede A2; A2 pede A1; A4 pede A1.
    expect(requisitosNaoMarcados(cat, ["A5"]).map((p) => p.codigo)).toEqual([
      "A1",
      "A2",
      "A3",
      "A4",
    ]);
    expect([...fechamento(cat, ["C3"])].sort()).toEqual(
      ["A1", "A2", "A3", "A4", "A5", "C1", "C3"].sort(),
    );
    // Marcar junto não pede mais nada.
    expect(requisitosNaoMarcados(cat, fechamento(cat, ["C3"]))).toEqual([]);
  });
});

describe("validação do seed", () => {
  it("o seed base dos testes é válido", () => {
    expect(errosDe(seedBase())).toEqual([]);
  });

  it("código repetido", () => {
    const s = seedBase();
    s.itens.push({ ...s.itens[0] });
    expect(errosDe(s).join()).toMatch(/Código repetido: A0/);
  });

  it("requisito desconhecido", () => {
    const s = seedBase();
    s.itens[1].requisitos = ["X9"];
    expect(errosDe(s).join()).toMatch(/requisito desconhecido X9/);
  });

  it("requisito posterior na mesma trilha", () => {
    const s = seedBase();
    s.itens[0].requisitos = ["A1"];
    expect(errosDe(s).join()).toMatch(/A0: requisito A1 da mesma trilha vem depois/);
  });

  it("ciclo entre trilhas", () => {
    const s = seedBase();
    s.itens[1].requisitos = ["B1"];
    s.itens[2].requisitos = ["A1"];
    expect(errosDe(s).join()).toMatch(/Ciclo de requisitos/);
  });

  it("trava cruzada sem ciclo", () => {
    // B1 pede A1, e A1 está atrás de A0, que pede B2, que vem depois de B1 na Cursos.
    const s = seedBase();
    s.itens.push({
      codigo: "B2",
      trilha: "cursos",
      titulo: "Quatro",
      criterio: "Feito.",
      horas: 1,
    });
    s.itens[0].requisitos = ["B2"];
    s.itens[2].requisitos = ["A1"];
    expect(errosDe(s).join()).toMatch(/Trava cruzada: nunca liberados A0, A1, B1, B2/);
  });

  it("texto com travessão, meia risca, ' - ' ou hífen entre palavras", () => {
    for (const titulo of ["Um — dois", "Um – dois", "Um - dois", "scikit-learn"]) {
      const s = seedBase();
      s.itens[0].titulo = titulo;
      expect(errosDe(s).join()).toMatch(/travessão ou hífen/);
    }
  });

  it("horas, aprovações, fase e trilha", () => {
    const s = seedBase();
    s.itens[0].horas = 0;
    s.itens[1].avaliacao = { tipo: "nota", minima: 80, aprovacoes: 3 };
    s.itens[2].fase = 0;
    const e = errosDe(s).join("\n");
    expect(e).toMatch(/A0: horas/);
    expect(e).toMatch(/A1: aprovações/);
    expect(e).toMatch(/B1: só itens da Teoria têm fase/);
    const t = seedBase();
    delete t.itens[0].fase;
    expect(errosDe(t).join()).toMatch(/A0: item da Teoria sem fase/);
  });

  it("campo desconhecido quebra a leitura e carregarCatalogo lança", () => {
    const s = seedBase();
    s.itens[0].antesDeComeçar = ["x"];
    expect(() => lerCatalogo(s)).toThrow();
    const t = seedBase();
    t.itens[0].requisitos = ["X9"];
    expect(() => carregarCatalogo(t)).toThrow(/plano.json inválido/);
  });
});
