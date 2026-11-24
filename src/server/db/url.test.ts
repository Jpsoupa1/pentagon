import { describe, expect, it } from "vitest";
import { ehBancoLocal, recusarBancoDeProducao, urlDoBanco } from "./url";

describe("urlDoBanco", () => {
  it("troca sslmode=require por verify-full e mantém o resto", () => {
    expect(
      urlDoBanco(
        "postgresql://u:p@ep-x.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
      ),
    ).toBe(
      "postgresql://u:p@ep-x.sa-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require",
    );
  });

  it("não mexe em URLs sem SSL ou que já escolheram a semântica do libpq", () => {
    const local = "postgres://pentagon:pentagon@localhost:5433/pentagon";
    expect(urlDoBanco(local)).toBe(local);
    const libpq = "postgres://u:p@h/db?uselibpqcompat=true&sslmode=require";
    expect(urlDoBanco(libpq)).toBe(libpq);
    const desligado = "postgres://u:p@h/db?sslmode=disable";
    expect(urlDoBanco(desligado)).toBe(desligado);
  });
});

describe("trava de banco de produção", () => {
  it("só aceita localhost de verdade como banco local", () => {
    expect(ehBancoLocal("postgres://pentagon:pentagon@localhost:5433/plano")).toBe(true);
    expect(ehBancoLocal("postgres://u@127.0.0.1/db")).toBe(true);
    expect(ehBancoLocal("postgres://u@ep-x.neon.tech/db?x=localhost")).toBe(false);
    expect(ehBancoLocal("postgres://localhost.evil/db")).toBe(false);
    expect(ehBancoLocal("não é uma url")).toBe(false);
  });

  it("recusa URLs da Neon e da Vercel", () => {
    expect(() => recusarBancoDeProducao("postgres://u@ep-x.neon.tech/db")).toThrow(/produção/);
    expect(() => recusarBancoDeProducao("postgres://u@x.vercel-storage.com/db")).toThrow();
    expect(() => recusarBancoDeProducao("postgres://u@localhost/db")).not.toThrow();
  });
});
