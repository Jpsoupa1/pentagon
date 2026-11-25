import { describe, expect, it } from "vitest";
import { menuDe } from "./navegacao";

describe("menuDe", () => {
  it("o dono vê Plano no lugar de Estudos e Trilhas, e continua com Cards", () => {
    const rotulos = menuDe(true).map((i) => i.rotulo);
    expect(rotulos).toContain("Plano");
    expect(rotulos).toContain("Cards");
    expect(rotulos).not.toContain("Estudos");
    expect(rotulos).not.toContain("Trilhas");
  });

  it("quem não é dono mantém o menu atual: Estudos e Trilhas, sem Plano", () => {
    const rotulos = menuDe(false).map((i) => i.rotulo);
    expect(rotulos).toContain("Estudos");
    expect(rotulos).toContain("Trilhas");
    expect(rotulos).toContain("Cards");
    expect(rotulos).not.toContain("Plano");
    expect(menuDe(false).some((i) => i.href === "/plano")).toBe(false);
  });
});
