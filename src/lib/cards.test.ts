import { describe, expect, it } from "vitest";
import {
  estatisticas,
  responder,
  sessaoDoDia,
  sorteio,
  validarImportacao,
  type CardAgendavel,
  type RespostaResumo,
} from "./cards";

const HOJE = "2026-10-21"; // quarta-feira

type Card = CardAgendavel & { acertos: number; erros: number };

let seq = 0;
function card(c: Partial<Card> = {}): Card {
  seq++;
  return {
    id: c.id ?? `id-${seq}`,
    chave: c.chave ?? `cka-${String(seq).padStart(3, "0")}`,
    trilha: "CKA",
    tema: "Arquitetura do cluster",
    origem: "aula",
    criadoEm: "2026-10-20",
    caixa: 1,
    proximaEm: null,
    suspenso: false,
    acertos: 0,
    erros: 0,
    ...c,
  };
}

/** Gerador determinístico (LCG) para os sorteios. */
function rngFixo(semente = 42) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

describe("responder (sessão do dia)", () => {
  it("acerto sobe uma caixa e agenda pelo intervalo da caixa nova", () => {
    const novo = card();
    const c2 = responder(novo, "acertou", "dia", HOJE);
    expect(c2).toMatchObject({ caixa: 2, proximaEm: "2026-10-24", acertos: 1 });
    const c3 = responder(c2, "acertou", "dia", "2026-10-24");
    expect(c3).toMatchObject({ caixa: 3, proximaEm: "2026-10-31" });
    const c4 = responder(c3, "acertou", "dia", "2026-10-31");
    expect(c4).toMatchObject({ caixa: 4, proximaEm: "2026-11-21" });
  });

  it("a caixa 4 continua na 4 e volta em 21 dias", () => {
    const c = responder(card({ caixa: 4, proximaEm: HOJE }), "acertou", "dia", HOJE);
    expect(c).toMatchObject({ caixa: 4, proximaEm: "2026-11-11" });
  });

  it("erro volta para a caixa 1, com revisão amanhã", () => {
    const c = responder(card({ caixa: 3, proximaEm: HOJE }), "errou", "dia", HOJE);
    expect(c).toMatchObject({ caixa: 1, proximaEm: "2026-10-22", erros: 1, acertos: 0 });
  });

  it("não muda o card original", () => {
    const original = card({ caixa: 2, proximaEm: HOJE });
    responder(original, "acertou", "dia", HOJE);
    expect(original).toMatchObject({ caixa: 2, proximaEm: HOJE, acertos: 0 });
  });
});

describe("sessão do dia", () => {
  it("atrasados primeiro (o mais antigo antes), depois os que vencem hoje", () => {
    const hoje = card({ caixa: 2, proximaEm: HOJE });
    const ontem = card({ caixa: 3, proximaEm: "2026-10-20" });
    const semana = card({ caixa: 1, proximaEm: "2026-10-14" });
    const futuro = card({ caixa: 2, proximaEm: "2026-10-22" });
    const s = sessaoDoDia([hoje, futuro, ontem, semana], [], 20, HOJE);
    expect(s.map((c) => c.id)).toEqual([semana.id, ontem.id, hoje.id]);
  });

  it("ordem: atrasados, depois novos de origem erro, depois novos de aula", () => {
    const aula = card({ origem: "aula", criadoEm: "2026-10-01" });
    const erro = card({ origem: "erro", criadoEm: "2026-10-19" });
    const atrasado = card({ caixa: 2, proximaEm: "2026-10-18" });
    const s = sessaoDoDia([aula, erro, atrasado], [], 20, HOJE);
    expect(s.map((c) => c.id)).toEqual([atrasado.id, erro.id, aula.id]);
  });

  it("respeita o limite diário", () => {
    const cards = Array.from({ length: 30 }, () => card());
    expect(sessaoDoDia(cards, [], 20, HOJE)).toHaveLength(20);
    expect(sessaoDoDia(cards, [], 5, HOJE)).toHaveLength(5);
  });

  it("o limite desconta o que já foi respondido hoje na sessão do dia", () => {
    const cards = Array.from({ length: 30 }, () => card());
    const respostas: RespostaResumo[] = cards.slice(0, 12).map((c) => ({
      cardId: c.id,
      data: HOJE,
      resultado: "acertou",
      modo: "dia",
    }));
    // Os 12 respondidos já foram reagendados; a sessão reaberta mostra só os 8 que faltam.
    const depois = cards.map((c, i) => (i < 12 ? { ...c, caixa: 2, proximaEm: "2026-10-24" } : c));
    const s = sessaoDoDia(depois, respostas, 20, HOJE);
    expect(s).toHaveLength(8);
    expect(s.every((c) => !respostas.some((r) => r.cardId === c.id))).toBe(true);
  });

  it("respostas do modo aleatório e de outros dias não contam no limite", () => {
    const cards = Array.from({ length: 5 }, () => card());
    const respostas: RespostaResumo[] = [
      { cardId: "x", data: HOJE, resultado: "acertou", modo: "aleatorio" },
      { cardId: "y", data: "2026-10-20", resultado: "acertou", modo: "dia" },
    ];
    expect(sessaoDoDia(cards, respostas, 5, HOJE)).toHaveLength(5);
  });

  it("deixa de fora suspensos e cards ainda não vencidos", () => {
    const suspenso = card({ suspenso: true });
    const suspensoVencido = card({ suspenso: true, proximaEm: "2026-10-10" });
    const futuro = card({ caixa: 4, proximaEm: "2026-11-01" });
    const ok = card();
    expect(sessaoDoDia([suspenso, suspensoVencido, futuro, ok], [], 20, HOJE)).toEqual([ok]);
  });

  it("card errado hoje volta amanhã, não na sessão de hoje de novo", () => {
    const c = card({ caixa: 2, proximaEm: HOJE });
    const errado = responder(c, "errou", "dia", HOJE);
    const respostas: RespostaResumo[] = [
      { cardId: c.id, data: HOJE, resultado: "errou", modo: "dia" },
    ];
    expect(sessaoDoDia([errado], respostas, 20, HOJE)).toEqual([]);
    expect(sessaoDoDia([errado], respostas, 20, "2026-10-22")).toHaveLength(1);
  });
});

describe("modo tema aleatório", () => {
  it("não repete card até esgotar os disponíveis", () => {
    const cards = Array.from({ length: 7 }, () => card());
    const s = sorteio(cards, { quantidade: 7 }, rngFixo());
    expect(new Set(s.map((c) => c.id)).size).toBe(7);
  });

  it("passando da quantidade disponível, só repete depois de todos saírem", () => {
    const cards = Array.from({ length: 4 }, () => card());
    const s = sorteio(cards, { quantidade: 10 }, rngFixo(7));
    expect(s).toHaveLength(10);
    expect(new Set(s.slice(0, 4).map((c) => c.id)).size).toBe(4);
    expect(new Set(s.slice(4, 8).map((c) => c.id)).size).toBe(4);
    // Na virada de rodada o mesmo card não sai duas vezes seguidas.
    for (let i = 1; i < s.length; i++) expect(s[i].id).not.toBe(s[i - 1].id);
  });

  it("sem fim devolve uma rodada com todos os disponíveis", () => {
    const cards = Array.from({ length: 6 }, () => card());
    expect(sorteio(cards, { quantidade: null }, rngFixo())).toHaveLength(6);
  });

  it("deixa os suspensos de fora", () => {
    const suspensos = Array.from({ length: 5 }, () => card({ suspenso: true }));
    const ativos = Array.from({ length: 3 }, () => card());
    const s = sorteio([...suspensos, ...ativos], { quantidade: 20 }, rngFixo());
    expect(s.length).toBe(20);
    expect(s.every((c) => !c.suspenso)).toBe(true);
    expect(sorteio(suspensos, { quantidade: 10 }, rngFixo())).toEqual([]);
  });

  it("filtra por trilha e por tema, misturando o acervo inteiro sem depender da data", () => {
    const futuro = card({ trilha: "CKA", tema: "Rede", caixa: 4, proximaEm: "2027-01-01" });
    const aws = card({ trilha: "AWS", tema: "IAM" });
    const rede = card({ trilha: "CKA", tema: "Rede" });
    const todos = [futuro, aws, rede];
    expect(new Set(sorteio(todos, { quantidade: null }, rngFixo()))).toEqual(new Set(todos));
    expect(sorteio(todos, { quantidade: null, trilha: "AWS" }, rngFixo())).toEqual([aws]);
    expect(new Set(sorteio(todos, { quantidade: null, tema: "Rede" }, rngFixo()))).toEqual(
      new Set([futuro, rede]),
    );
  });

  it("acerto não adianta a caixa; erro manda para a caixa 1", () => {
    const c = card({ caixa: 3, proximaEm: "2026-10-30" });
    expect(responder(c, "acertou", "aleatorio", HOJE)).toMatchObject({
      caixa: 3,
      proximaEm: "2026-10-30",
      acertos: 1,
    });
    expect(responder(c, "errou", "aleatorio", HOJE)).toMatchObject({
      caixa: 1,
      proximaEm: "2026-10-22",
      erros: 1,
    });
  });
});

describe("importação", () => {
  const valido = {
    id: "cka-arq-001",
    trilha: "CKA",
    tema: "Arquitetura do cluster",
    frente: "Qual é o único componente que lê e grava no etcd?",
    verso: "O kube-apiserver.",
    codigo: "kubectl get pods -n kube-system",
    origem: "aula",
    criado_em: "2026-10-20",
  };

  it("aceita o formato { cards: [...] } e mantém a indentação do código", () => {
    const codigo = "\napiVersion: v1\nkind: Pod\nmetadata:\n  name: web\n  \n";
    const r = validarImportacao({ cards: [{ ...valido, codigo }] }, []);
    expect(r.ok && r.validos[0].codigo).toBe("apiVersion: v1\nkind: Pod\nmetadata:\n  name: web");
  });

  it("código é opcional", () => {
    const semCodigo: Record<string, unknown> = { ...valido };
    delete semCodigo.codigo;
    const r = validarImportacao({ cards: [semCodigo] }, []);
    expect(r.ok && r.validos[0].codigo).toBeNull();
  });

  it("ignora ids repetidos (no acervo e no próprio JSON) e aponta erros sem descartar os válidos", () => {
    const r = validarImportacao(
      {
        cards: [
          valido,
          { ...valido, id: "cka-arq-002" },
          { ...valido, id: "cka-arq-002", frente: "outra" },
          { ...valido, id: "cka-arq-003", origem: "livro" },
          { ...valido, id: "cka-arq-004", frente: "" },
          "não é card",
        ],
      },
      ["cka-arq-001"],
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.validos.map((c) => c.id)).toEqual(["cka-arq-002"]);
    expect(r.repetidos).toEqual(["cka-arq-001", "cka-arq-002"]);
    expect(r.erros.map((e) => [e.indice, e.id])).toEqual([
      [3, "cka-arq-003"],
      [4, "cka-arq-004"],
      [5, null],
    ]);
    expect(r.erros[0].mensagens[0]).toMatch(/^origem:/);
  });

  it("recusa JSON sem lista de cards", () => {
    expect(validarImportacao({ itens: [] }, []).ok).toBe(false);
    expect(validarImportacao({ cards: [] }, []).ok).toBe(false);
  });
});

describe("estatísticas", () => {
  it("conta por caixa, taxa por tema e cards errados desde segunda", () => {
    const a = card({ caixa: 2, proximaEm: "2026-10-23", acertos: 3, erros: 1 });
    const b = card({ caixa: 1, proximaEm: "2026-10-22", acertos: 1, erros: 1 });
    const c = card({ tema: "Rede" });
    const respostas: RespostaResumo[] = [
      { cardId: b.id, data: "2026-10-20", resultado: "errou", modo: "dia" },
      { cardId: b.id, data: HOJE, resultado: "errou", modo: "aleatorio" },
      { cardId: a.id, data: "2026-10-18", resultado: "errou", modo: "dia" }, // domingo passado
    ];
    const e = estatisticas([a, b, c], respostas, HOJE);
    expect(e.porCaixa).toEqual({ 1: 1, 2: 1, 3: 0, 4: 0 });
    expect(e.novos).toBe(1);
    expect(e.erradosNaSemana).toBe(1);
    expect(e.porTema.find((t) => t.tema === "Arquitetura do cluster")?.taxa).toBeCloseTo(4 / 6);
    expect(e.porTema.find((t) => t.tema === "Rede")?.taxa).toBeNull();
  });
});
