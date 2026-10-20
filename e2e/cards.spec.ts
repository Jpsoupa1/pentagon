import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const exemplo = readFileSync("docs/cards/exemplo-cka.json", "utf8");

type Acervo = {
  cards: { chave: string; caixa: number; proximaEm: string | null; acertos: number }[];
  respostas: { modo: string; resultado: string }[];
};

async function responder(page: Page, resultado: "Errei" | "Acertei") {
  await page.getByRole("button", { name: "Mostrar resposta" }).click();
  await page.getByRole("button", { name: resultado, exact: true }).click();
}

test("Cards: importa, revisa a sessão do dia (parte offline) e sorteia sem repetir", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  // Importação: os 5 entram; colar de novo só mostra repetidos.
  await page.goto("/cards/importar");
  const campo = page.getByLabel("Cards", { exact: true });
  await campo.fill(exemplo);
  await page.getByRole("button", { name: "Conferir" }).click();
  await page.getByRole("button", { name: "Importar 5 cards" }).click();
  await expect(page.getByRole("heading", { name: "Importação concluída" })).toBeVisible();
  await campo.fill(exemplo);
  await page.getByRole("button", { name: "Conferir" }).click();
  await expect(page.getByRole("button", { name: "Importar 0 cards" })).toBeDisabled();
  await expect(page.getByText(/Ignorados \(id repetido\)/)).toBeVisible();

  // Sessão do dia: o card do caderno de erros vem antes dos de aula.
  await page.goto("/cards/dia");
  await expect(page.getByText("1 de 5")).toBeVisible();
  await expect(page.getByText(/ClusterIP pode ser acessado/)).toBeVisible();
  await responder(page, "Errei");
  // Errou: volta no fim da sessão.
  await expect(page.getByText("2 de 6")).toBeVisible();

  // Sem internet: as respostas ficam na fila do aparelho.
  await context.setOffline(true);
  for (let i = 0; i < 4; i++) await responder(page, "Acertei");
  await expect(page.getByText("6 de 6")).toBeVisible();
  await expect(page.getByText(/repetição/)).toBeVisible();
  await expect(page.getByText(/ClusterIP pode ser acessado/)).toBeVisible();
  await responder(page, "Acertei");
  await expect(page.getByRole("heading", { name: "Sessão concluída" })).toBeVisible();
  await expect(page.getByText("4 alterações aguardando conexão")).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText(/aguardando conexão/)).toBeHidden({ timeout: 15_000 });
  const servidor = (await (await page.request.get("/api/cards")).json()) as Acervo;
  // A repetição do card errado não reagenda de novo: 1 erro + 4 acertos.
  expect(servidor.respostas).toHaveLength(5);
  const porChave = Object.fromEntries(servidor.cards.map((c) => [c.chave, c]));
  expect(porChave["cka-erro-001"]).toMatchObject({ caixa: 1 });
  expect(porChave["cka-arq-001"]).toMatchObject({ caixa: 2, acertos: 1 });

  // Tela Hoje: nada falta, os dois atalhos aparecem.
  await page.goto("/");
  const bloco = page.getByRole("region", { name: "Cards de hoje" });
  await expect(bloco).toContainText("tudo revisado por hoje");
  await bloco.getByRole("link", { name: "Tema aleatório" }).click();

  // Tema aleatório: 10 perguntas de 5 cards; as 5 primeiras são todas diferentes.
  await expect(page).toHaveURL(/\/cards\/aleatorio$/);
  await page.getByRole("button", { name: "Sortear e começar" }).click();
  await expect(page.getByText("1 de 10")).toBeVisible();
  const frentes = new Set<string>();
  for (let i = 0; i < 5; i++) {
    frentes.add((await page.locator("p").filter({ hasText: "?" }).first().textContent()) ?? "");
    await responder(page, "Acertei");
  }
  expect(frentes.size).toBe(5);
  await expect(page.getByText("6 de 10")).toBeVisible();
  const depois = (await (await page.request.get("/api/cards")).json()) as Acervo;
  // Acerto no aleatório não adianta a caixa.
  expect(depois.cards.find((c) => c.chave === "cka-erro-001")).toMatchObject({ caixa: 1 });
});
