import { describe, expect, it } from "vitest";
import { mediaParcial } from "./media";

describe("média parcial", () => {
  it("pondera pelas notas lançadas", () => {
    expect(
      mediaParcial([
        { nota: 8, peso: 2 },
        { nota: 5, peso: 1 },
        { nota: null, peso: 3 },
      ]),
    ).toBe(7);
  });
  it("sem notas não há média", () => {
    expect(mediaParcial([{ nota: null, peso: 1 }])).toBeNull();
  });
});
