import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addDias } from "@/lib/tempo";
import { ROTINA, TODOS_OS_DIAS } from "./trilha";

// O cronograma em docs/trilha é a fonte de verdade da trilha: cada célula das tabelas tem que
// sair igual no seed (sem a formatação de código do markdown e sem o horário entre parênteses,
// que vem de Ajustes).

const md = readFileSync(
  join(process.cwd(), "docs/trilha/cronograma-semanal-trilha-devops.md"),
  "utf8",
);

const DIA: Record<string, number> = {
  Segunda: 0,
  Terça: 1,
  Quarta: 2,
  Quinta: 3,
  Sexta: 4,
  Sábado: 5,
  Domingo: 6,
};

type SemanaDoDoc = {
  n: number;
  inicio: string;
  titulo: string;
  linhas: { dia: string; manha: string; tarde: string }[];
};

function limpar(celula: string) {
  return celula
    .replace(/`/g, "")
    .replace(/ \((09:00 às 12:00|19:00 às 20:00)\)$/, "")
    .trim();
}

function semanasDoDoc(): SemanaDoDoc[] {
  const saida: SemanaDoDoc[] = [];
  let atual: SemanaDoDoc | null = null;
  for (const linha of md.split("\n")) {
    const cab = linha.match(/^### Semana (zero|\d+) · (\d\d)\/(\d\d)\/(\d{4}) a .+? · (.+)$/);
    if (cab) {
      atual = {
        n: cab[1] === "zero" ? 0 : Number(cab[1]),
        inicio: `${cab[4]}-${cab[3]}-${cab[2]}`,
        titulo: cab[5],
        linhas: [],
      };
      saida.push(atual);
      continue;
    }
    if (!atual || !linha.startsWith("| ") || linha.startsWith("| Dia") || linha.startsWith("| ---"))
      continue;
    const [, dia, manha, tarde = ""] = linha.split("|").map((c) => c.trim());
    atual.linhas.push({ dia, manha: limpar(manha), tarde: limpar(tarde) });
  }
  return saida;
}

describe("cronograma da trilha (versão 2)", () => {
  const doc = semanasDoDoc();

  it("tem as 50 semanas, da zero à 49, nas datas do app", () => {
    expect(doc.map((s) => s.n)).toEqual(Array.from({ length: 50 }, (_, i) => i));
    expect(doc.map((s) => s.inicio)).toEqual(ROTINA.SEMANAS.map((s) => s.inicio));
  });

  it("tema e parte de cada semana iguais aos do documento", () => {
    for (const s of doc) {
      const r = ROTINA.SEMANAS[s.n];
      expect(r.parte ? `${r.tema} (parte ${r.parte})` : r.tema, `semana ${s.n}`).toBe(s.titulo);
    }
  });

  it("cada sessão do seed tem exatamente o texto do documento", () => {
    for (const s of doc) {
      const sessoes = ROTINA.sessoesEntre(s.inicio, addDias(s.inicio, 6), TODOS_OS_DIAS);
      const esperado: string[] = [];
      for (const l of s.linhas) {
        const data = addDias(s.inicio, DIA[l.dia]);
        if (s.n === 0) {
          esperado.push(`${data} ${l.manha}`);
          continue;
        }
        esperado.push(`${data} ${l.manha}`);
        // A tarde de sexta é livre (reposição, se precisar): não vira sessão.
        if (l.tarde && l.dia !== "Sexta") esperado.push(`${data} ${l.tarde}`);
      }
      expect(
        sessoes.map((x) => `${x.data} ${x.texto}`),
        `semana ${s.n}`,
      ).toEqual(esperado);
    }
  });

  it("segunda a quinta têm duas sessões, sexta a revisão às 08:00, domingo a revisão espaçada", () => {
    const semana = ROTINA.sessoesEntre("2026-11-09", "2026-11-15");
    const porDia = (d: string) => semana.filter((s) => s.data === d);
    for (const d of ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"]) {
      expect(porDia(d).map((s) => [s.turno, s.categoria, s.ini])).toEqual([
        ["manha", "conteudo", "08:00"],
        ["tarde", "pratica", "14:00"],
      ]);
    }
    expect(porDia("2026-11-13").map((s) => [s.categoria, s.ini, s.fim])).toEqual([
      ["revisao_semanal", "08:00", "09:30"],
    ]);
    expect(porDia("2026-11-14").map((s) => [s.categoria, s.ini, s.fim])).toEqual([
      ["projeto", "09:00", "12:00"],
    ]);
    expect(porDia("2026-11-15").map((s) => [s.categoria, s.ini, s.texto])).toEqual([
      ["revisao_espacada", "19:00", "Revisão espaçada e planejamento"],
    ]);
    expect(semana.reduce((t, s) => t + s.min, 0)).toBe(17 * 60 + 30);
  });

  it("semana 1 é a revisão da CKA e a semana 3 é Cluster Maintenance em manhã e tarde", () => {
    const [manha, tarde] = ROTINA.sessoesDoDia("2026-10-26");
    expect(manha.tema).toBe("Revisão CKA 1: Core Concepts e Scheduling");
    expect(manha.texto).toMatch(/^Revisão: arquitetura do cluster/);
    expect(tarde.texto).toMatch(/^Drill: inspecionar o control plane/);
    expect(ROTINA.SEMANAS.some((s) => s.tema === "Application Lifecycle")).toBe(false);

    const [m3, t3] = ROTINA.sessoesDoDia("2026-11-09");
    expect([m3.semana, m3.tema, m3.parte]).toEqual([3, "Cluster Maintenance", "1 de 2"]);
    expect([m3.titulo, t3.titulo]).toEqual([
      "Aula: Drain, cordon e atualização do sistema dos nós",
      "Prática do tema da manhã",
    ]);
  });

  it("só o estudo da manhã em dia útil pode cair dentro do estágio", () => {
    const semana = ROTINA.sessoesEntre("2026-11-09", "2026-11-15");
    expect(semana.filter((s) => s.permiteSobreposicao).map((s) => s.chave)).toEqual([
      "1-manha",
      "2-manha",
      "3-manha",
      "4-manha",
      "5-manha",
    ]);
  });
});
