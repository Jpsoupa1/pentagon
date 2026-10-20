import { describe, expect, it } from "vitest";
import { emailPermitido, recebeConteudoPessoal } from "./permissao";

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

describe("OWNER_EMAILS", () => {
  it("só o dono recebe a rotina e as trilhas; os outros começam vazios", () => {
    expect(recebeConteudoPessoal("Joao@Exemplo.com", "joao@exemplo.com")).toBe(true);
    expect(recebeConteudoPessoal("amigo@exemplo.com", "joao@exemplo.com")).toBe(false);
    expect(recebeConteudoPessoal(null, "joao@exemplo.com")).toBe(false);
  });

  it("sem a variável, todo mundo recebe (como antes)", () => {
    expect(recebeConteudoPessoal("amigo@exemplo.com", undefined)).toBe(true);
    expect(recebeConteudoPessoal("amigo@exemplo.com", " ")).toBe(true);
  });
});
