import { describe, expect, it } from "vitest";
import { dataDoArquivamento, nomeDoArquivado } from "./arquivadas";

describe("nomeDoArquivado", () => {
  it("monta o nome legível de cada tipo", () => {
    expect(nomeDoArquivado("trilha_estudo", "devops", "Trilha DevOps")).toBe("Trilha DevOps");
    expect(nomeDoArquivado("roadmap", "seguranca", "Trilha Segurança")).toBe("Roadmap Segurança");
    expect(nomeDoArquivado("cards", "CKA", null)).toBe("Cards CKA");
    expect(nomeDoArquivado("evento", "id-1", "Ciber e SecOps")).toBe("Compromisso Ciber e SecOps");
    expect(nomeDoArquivado("erros", "antes_do_plano", null)).toBe("Erros anteriores ao plano");
  });

  it("sem nome no catálogo, mostra a chave guardada", () => {
    expect(nomeDoArquivado("roadmap", "antigo", null)).toBe("Roadmap antigo");
  });
});

describe("dataDoArquivamento", () => {
  it("usa o dia do fuso, não o de UTC", () => {
    const instante = new Date("2026-11-25T02:30:00Z");
    expect(dataDoArquivamento(instante, "America/Sao_Paulo")).toBe("24 de novembro");
    expect(dataDoArquivamento(instante, "UTC")).toBe("25 de novembro");
  });
});
