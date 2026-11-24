import { describe, expect, it } from "vitest";
import { menuDe } from "./navegacao";

describe("menuDe", () => {
  it("o dono vê Plano, ao lado de Estudos e Trilhas", () => {
    const rotulos = menuDe(true).map((i) => i.rotulo);
    expect(rotulos).toContain("Plano");
    expect(rotulos).toContain("Estudos");
    expect(rotulos).toContain("Trilhas");
  });

  it("quem não é dono não vê Plano e mantém o resto do menu", () => {
    const rotulos = menuDe(false).map((i) => i.rotulo);
    expect(rotulos).not.toContain("Plano");
    expect(menuDe(false)).toHaveLength(menuDe(true).length - 1);
    expect(menuDe(false).some((i) => i.href === "/plano")).toBe(false);
  });
});
