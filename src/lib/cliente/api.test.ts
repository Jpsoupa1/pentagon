import { afterEach, describe, expect, it, vi } from "vitest";

const enfileirar = vi.hoisted(() => vi.fn());
vi.mock("./fila", () => ({ enfileirar }));

import { enviar, SEM_CONEXAO } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  enfileirar.mockReset();
});

describe("enviar com semFila", () => {
  it("sem conexão recusa e não enfileira", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await enviar("POST", "/x", { a: 1 }, { semFila: true })).toEqual({
      ok: false,
      erro: SEM_CONEXAO,
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(enfileirar).not.toHaveBeenCalled();
  });

  it("fetch que lança também recusa sem enfileirar", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("falhou")));
    expect(await enviar("POST", "/x", undefined, { semFila: true })).toEqual({
      ok: false,
      erro: SEM_CONEXAO,
    });
    expect(enfileirar).not.toHaveBeenCalled();
  });

  it("sem a opção, o comportamento antigo continua: enfileira", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(await enviar("PUT", "/x", { a: 1 })).toEqual({ ok: true, enfileirado: true });
    expect(enfileirar).toHaveBeenCalledWith({ metodo: "PUT", url: "/x", corpo: { a: 1 } });
  });
});
