import { describe, expect, it } from "vitest";
import { emailPermitido } from "./permissao";

describe("ALLOWED_EMAILS", () => {
  it("aceita só emails da lista, sem diferenciar maiúsculas", () => {
    const lista = "joao@exemplo.com, outro@exemplo.com";
    expect(emailPermitido("Joao@Exemplo.com", lista)).toBe(true);
    expect(emailPermitido("intruso@exemplo.com", lista)).toBe(false);
  });

  it("nega tudo se a lista estiver vazia ou sem email", () => {
    expect(emailPermitido("joao@exemplo.com", "")).toBe(false);
    expect(emailPermitido(null, "joao@exemplo.com")).toBe(false);
  });
});
