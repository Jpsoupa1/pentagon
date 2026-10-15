import { describe, expect, it } from "vitest";
import { urlDoBanco } from "./url";

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
