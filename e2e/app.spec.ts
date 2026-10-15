import { expect, test, type Page } from "@playwright/test";

const LARGURAS = [
  { nome: "iphone", largura: 390, altura: 844, nav: "Principal" },
  { nome: "ipad-vertical", largura: 820, altura: 1180, nav: "Principal" },
  { nome: "notebook-1180", largura: 1180, altura: 820, nav: "Principal" },
  { nome: "notebook-1440", largura: 1440, altura: 900, nav: "Principal" },
];

const PAGINAS = [
  "/",
  "/agenda",
  "/aulas",
  "/provas",
  "/estudos",
  "/estagio",
  "/lembretes",
  "/areas",
  "/ajustes",
];

function vigiarConsole(page: Page) {
  const erros: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") erros.push(m.text());
  });
  page.on("pageerror", (e) => erros.push(e.message));
  return erros;
}

test.describe("sem sessão", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redireciona para o login e a API responde 401", async ({ page, request }) => {
    await page.goto("/agenda");
    await expect(page).toHaveURL(/\/login\?voltar=%2Fagenda/);
    await expect(page.getByRole("button", { name: "Entrar com GitHub" })).toBeVisible();
    const r = await request.get("/api/eventos");
    expect(r.status()).toBe(401);
  });

  test("cron exige CRON_SECRET", async ({ request }) => {
    expect((await request.get("/api/cron/reconciliar")).status()).toBe(401);
  });
});

for (const t of LARGURAS) {
  test(`navega em ${t.largura}px sem rolagem lateral nem erros`, async ({ page }) => {
    const erros = vigiarConsole(page);
    await page.setViewportSize({ width: t.largura, height: t.altura });
    for (const caminho of PAGINAS) {
      await page.goto(caminho);
      await expect(page.locator("h1")).toBeVisible();
      const larguraDoc = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(larguraDoc, `rolagem lateral em ${caminho}`).toBeLessThanOrEqual(t.largura);
      await expect(
        page.getByRole("navigation", { name: t.nav }).filter({ visible: true }),
      ).toHaveCount(1);
    }
    await page.goto("/");
    await page.screenshot({ path: `test-results/telas/hoje-${t.nome}.png`, fullPage: true });
    await page.goto("/agenda");
    await page.screenshot({ path: `test-results/telas/agenda-${t.nome}.png`, fullPage: true });
    expect(erros).toEqual([]);
  });
}

test("cria compromisso semanal pelo Novo item e ele aparece na Agenda", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByText("Nada agendado por enquanto.")).toBeVisible();
  await page.getByRole("button", { name: "Novo item" }).first().click();
  const folha = page.getByRole("dialog", { name: "Novo item" });
  await folha.getByLabel("Título").fill("Academia");
  await folha.getByText("Pessoal", { exact: true }).click();
  await folha.getByLabel("Início").fill("16:00");
  await folha.getByLabel("Fim").fill("17:30");
  await folha.getByRole("combobox", { name: "Repetir" }).selectOption("uteis");
  await folha.getByRole("button", { name: "Salvar na agenda" }).click();
  await expect(folha).toBeHidden();
  await page.goto("/agenda");
  await expect(
    page.locator('[data-area="pessoal"]').filter({ hasText: "Academia" }).first(),
  ).toBeVisible();
});

test("valida a entrada na API", async ({ request }) => {
  const r = await request.post("/api/eventos", { data: { titulo: "", areaId: "x" } });
  expect(r.status()).toBe(400);
  const json = await r.json();
  expect(json.campos.titulo).toBeTruthy();
});

test("cria disciplina e exporta os dados em JSON", async ({ page, request }) => {
  await page.goto("/aulas");
  await expect(page.getByText("Nenhuma aula cadastrada. Adicione a primeira.")).toBeVisible();
  await page.getByRole("button", { name: "Nova disciplina" }).click();
  const folha = page.getByRole("dialog", { name: "Nova disciplina" });
  await folha.getByLabel("Nome").fill("Cálculo");
  await folha.getByLabel("Sigla").fill("CALC");
  await folha.getByRole("button", { name: "Salvar disciplina" }).click();
  await expect(page.getByRole("link", { name: /Cálculo/ })).toBeVisible();

  const r = await request.get("/api/exportar");
  expect(r.ok()).toBe(true);
  const dados = await r.json();
  expect(dados.app).toBe("Pentagon");
  expect(dados.disciplinas.map((d: { nome: string }) => d.nome)).toContain("Cálculo");
});

test("PWA: manifest e service worker publicados", async ({ request }) => {
  const m = await (await request.get("/manifest.webmanifest")).json();
  expect(m.name).toBe("Pentagon");
  expect(m.display).toBe("standalone");
  const sw = await request.get("/serwist/sw.js");
  expect(sw.ok()).toBe(true);
});

test("abre offline na primeira abertura e sincroniza a fila", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Service worker com offline só é confiável no Chromium do Playwright",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  // Primeira abertura: nenhuma outra tela visitada, sem recarregar.
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(
      () => page.evaluate(async () => !!(await (await caches.open("paginas")).match("/lembretes"))),
      {
        timeout: 15_000,
      },
    )
    .toBe(true);

  await context.setOffline(true);
  await page.goto("/agenda");
  await expect(page.locator("h1")).toHaveText("Agenda");
  await page.goto("/");
  await expect(page.locator("h1")).toContainText(/Bom dia|Boa tarde|Boa noite/);
  await expect(page.getByText("Sem conexão. Mostrando a última versão salva.")).toBeVisible();

  await page.goto("/lembretes");
  await page.getByRole("button", { name: "Novo lembrete" }).click();
  const folha = page.getByRole("dialog", { name: "Novo lembrete" });
  await folha.getByLabel("Lembrar de").fill("Comprar café");
  await folha.getByRole("button", { name: "Salvar lembrete" }).click();
  await expect(page.getByText("1 alteração aguardando conexão")).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText("1 alteração aguardando conexão")).toBeHidden({ timeout: 10_000 });
  await page.goto("/lembretes");
  await expect(page.getByText("Comprar café")).toBeVisible();
});

test("cria lembrete online", async ({ page }) => {
  await page.goto("/lembretes");
  await page.getByRole("button", { name: "Novo lembrete" }).click();
  const folha = page.getByRole("dialog", { name: "Novo lembrete" });
  await folha.getByLabel("Lembrar de").fill("Ligar para o banco");
  await folha.getByRole("button", { name: "Salvar lembrete" }).click();
  await expect(folha).toBeHidden();
  await expect(page.getByText("Ligar para o banco")).toBeVisible();
});
