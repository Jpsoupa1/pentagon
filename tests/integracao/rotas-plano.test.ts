import { describe, expect, it, vi } from "vitest";

// A rota real só roda `after()` dentro de uma requisição: aqui se confere a opção que ela recebe.
vi.mock("@/server/api", () => ({
  rota: (_fn: unknown, opcoes: unknown) => ({ opcoes }),
  corpo: vi.fn(),
}));

type RotaSimulada = { opcoes?: { reconciliar?: boolean } };

const CAMINHOS = {
  inicio: () => import("@/app/api/plano/inicio/route"),
  concluir: () => import("@/app/api/plano/itens/[codigo]/concluir/route"),
  tentativa: () => import("@/app/api/plano/itens/[codigo]/tentativas/route"),
  desfazer: () => import("@/app/api/plano/itens/[codigo]/desfazer/route"),
  folga: () => import("@/app/api/plano/folga/route"),
  bloco: () => import("@/app/api/plano/blocos/[bloco]/route"),
  troca: () => import("@/app/api/plano/blocos/[bloco]/troca/route"),
};

describe("rotas do plano que mexem nos avisos", () => {
  it.each(Object.entries(CAMINHOS))(
    "%s reconcilia os avisos depois de responder",
    async (_, carregar) => {
      const modulo = (await carregar()) as Record<string, RotaSimulada>;
      const metodo = modulo.PUT ?? modulo.POST;
      expect(metodo.opcoes?.reconciliar).toBe(true);
    },
  );
});
