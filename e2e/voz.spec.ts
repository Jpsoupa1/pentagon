import { expect, test } from "@playwright/test";

// A API do Claude é simulada (e2e/claude-falso.ts): nada de rede nem créditos.

test.describe("Assistente de voz", () => {
  test("abre pronto para ouvir, sem rolagem lateral, em todas as larguras", async ({ page }) => {
    for (const [largura, altura] of [
      [390, 844],
      [820, 1180],
      [1440, 900],
    ]) {
      await page.setViewportSize({ width: largura, height: altura });
      await page.goto("/voz");
      await expect(page.getByRole("heading", { name: "O que você quer fazer?" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Toque para falar" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Digitar em vez de falar" })).toBeVisible();
      const doc = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(doc).toBeLessThanOrEqual(largura);
    }
  });

  test("pedido digitado: mostra o que mudou e desfaz", async ({ page }) => {
    await page.goto("/voz");
    await page.getByRole("button", { name: "Digitar em vez de falar" }).click();
    await page.getByRole("textbox").fill("Me lembra de revisar Cálculo amanhã às três");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByRole("heading", { name: "Pronto. Fiz 1 alteração." })).toBeVisible();
    const cartao = page.getByRole("article", { name: "Revisar Cálculo" });
    await expect(cartao.getByText("CRIADO")).toBeVisible();
    await expect(page).toHaveURL(/\/voz\?execucao=/);

    await page.goto("/lembretes");
    await expect(page.getByText("Revisar Cálculo").first()).toBeVisible();
    await page.goBack();
    await page
      .getByRole("article", { name: "Revisar Cálculo" })
      .getByRole("button", { name: "Desfazer" })
      .click();
    await expect(
      page.getByRole("article", { name: "Revisar Cálculo" }).getByText("Desfeito"),
    ).toBeVisible();
  });

  test("fora do escopo mostra a recusa fixa do app", async ({ page }) => {
    await page.goto(`/voz?texto=${encodeURIComponent("quem descobriu o Brasil?")}`);
    await expect(
      page.getByText(
        "Isso fica fora do que eu faço aqui. Posso ajudar com sua agenda, aulas, provas, estudos, estágio e lembretes.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
  });

  test("consulta é respondida com os dados do app", async ({ page }) => {
    await page.goto(`/voz?texto=${encodeURIComponent("o que eu tenho amanhã?")}`);
    await expect(page.getByText("Você pediu")).toBeVisible();
    // Amanhã pode ser um dia sem nada (fim de semana fora da trilha): vale a lista ou o aviso.
    await expect(
      page.getByRole("listitem").first().or(page.getByText("Nada na agenda nesse período.")),
    ).toBeVisible();
  });

  test("Ajustes mostra o consumo do mês", async ({ page }) => {
    await page.goto("/ajustes");
    await expect(page.getByText(/Consumo deste mês: US\$ \d+\.\d{2}/)).toBeVisible();
  });
});

test("Assistente: no celular, abre pelo topo de Hoje e pela página Áreas", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: "Abrir o assistente de voz" }).click();
  await expect(page).toHaveURL(/\/voz$/);
  await page.goto("/areas");
  await page.getByRole("link", { name: "Assistente" }).click();
  await expect(page.getByRole("heading", { name: "O que você quer fazer?" })).toBeVisible();
});
