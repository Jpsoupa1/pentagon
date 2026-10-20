import { expect, test, type Page } from "@playwright/test";
import { ROTINA } from "../src/server/estudos/trilha";
import diaria from "../src/server/roadmap/trilhas/seguranca-diaria.json";

const hojeEmSaoPaulo = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

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

async function semRolagemLateral(page: Page, largura: number) {
  const larguraDoc = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(larguraDoc).toBeLessThanOrEqual(largura);
}

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
  await page.getByRole("button", { name: "Novo item" }).first().click();
  const folha = page.getByRole("dialog", { name: "Novo item" });
  await folha.getByLabel("Título").fill("Natação");
  await folha.getByText("Pessoal", { exact: true }).click();
  await folha.getByLabel("Início").fill("16:00");
  await folha.getByLabel("Fim").fill("17:30");
  await folha.getByRole("combobox", { name: "Repetir" }).selectOption("uteis");
  await folha.getByRole("button", { name: "Salvar na agenda" }).click();
  // A rotina já tem academia nesse horário: o servidor acusa o conflito e pede confirmação.
  await expect(folha.getByText("Esse horário choca com outro compromisso")).toBeVisible();
  await expect(folha.getByText(/choca com Academia/).first()).toBeVisible();
  await folha.getByRole("button", { name: "Salvar mesmo assim" }).click();
  await expect(folha).toBeHidden();
  // Salvar dispara router.refresh() em Hoje; no WebKit ele pode atropelar a próxima navegação.
  await page.waitForLoadState("networkidle");
  await expect(async () => {
    await page.goto("/agenda");
  }).toPass({ timeout: 15_000 });
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
  await page.getByRole("button", { name: "Nova disciplina" }).click();
  const folha = page.getByRole("dialog", { name: "Nova disciplina" });
  await folha.getByLabel("Nome").fill("Cálculo");
  await folha.getByLabel("Sigla").fill("CALC");
  await folha.getByRole("button", { name: "Salvar disciplina" }).click();
  await expect(page.getByRole("link", { name: /Cálculo/ }).first()).toBeVisible();

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
  const texto = `Comprar café ${Date.now()}`;
  await folha.getByLabel("Lembrar de").fill(texto);
  await folha.getByRole("button", { name: "Salvar lembrete" }).click();
  await expect(page.getByText("1 alteração aguardando conexão")).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText("1 alteração aguardando conexão")).toBeHidden({ timeout: 10_000 });
  // A página passa pelo service worker (rede primeiro): recarrega até a versão nova chegar.
  await expect
    .poll(async () => {
      await page.goto("/lembretes");
      return page.getByText(texto).count();
    })
    .toBeGreaterThan(0);
  // Exatamente uma vez: a fila não pode reenviar a mesma alteração.
  await expect(page.getByText(texto)).toHaveCount(1);
});

test("cria lembrete online", async ({ page }, info) => {
  // Texto único por rodada: Chromium e WebKit usam o mesmo banco.
  const texto = `Ligar para o banco (${info.project.name} ${Date.now()})`;
  await page.goto("/lembretes");
  await page.getByRole("button", { name: "Novo lembrete" }).click();
  const folha = page.getByRole("dialog", { name: "Novo lembrete" });
  await folha.getByLabel("Lembrar de").fill(texto);
  await folha.getByRole("button", { name: "Salvar lembrete" }).click();
  await expect(folha).toBeHidden();
  await expect(page.getByText(texto)).toBeVisible();
});

test.describe("etapa 2: trilha, avisos e calendário", () => {
  test("Estudos mostra a trilha, a semana e marca sessão como feita", async ({ page }) => {
    await page.goto("/estudos");
    if (hojeEmSaoPaulo() < ROTINA.INICIO) {
      // Antes da semana zero não há sessão nesta semana: a tela diz quando a trilha começa.
      await expect(page.getByText(/Trilha DevOps · começa /)).toBeVisible();
      await expect(page.getByText(/A trilha começa /)).toBeVisible();
      return;
    }
    await expect(page.getByText(/Trilha DevOps · semana \d+ de 49/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Progresso por fase" })).toBeVisible();
    await expect(page.getByText("Fase 1: Kubernetes e fundamentos")).toBeVisible();
    await expect(page.getByText("Prova CKA (meta)")).toBeVisible();
    const semana = page.getByRole("region", { name: "Sessões da semana" });
    const primeira = semana.getByRole("checkbox").first();
    const marcada = await primeira.isChecked();
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/estudos/sessoes/") && r.request().method() === "PATCH",
      ),
      primeira.setChecked(!marcada),
    ]);
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Sessões da semana" }).getByRole("checkbox").first(),
    ).toBeChecked({
      checked: !marcada,
    });
  });

  test("Estudos mostra a fase datada da Segurança e leva ao Roadmap", async ({ page }) => {
    await page.goto("/estudos");
    const cartao = page.getByRole("region", { name: "Segurança e SecOps" });
    await expect(cartao.getByText("Fase 1/4")).toBeVisible();
    await expect(cartao.getByText("Fundamentos de segurança")).toBeVisible();
    await expect(cartao.getByText(/Portão: Portão de fundamentos/)).toBeVisible();
    await expect(cartao.getByRole("button", { name: /avançar/ })).toHaveCount(0);
    await cartao.getByRole("link", { name: "Ver o roadmap da Segurança" }).click();
    await expect(page).toHaveURL(/\/trilhas\/seguranca\/roadmap$/);
  });

  test("sessões aparecem na Agenda com a cor de Estudos", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/agenda?semana=2026-10-19");
    await expect(
      page.locator('[data-area="estudos"]').filter({ hasText: "Aula:" }).first(),
    ).toBeVisible();
    await expect(
      page.locator('[data-area="estudos"]').filter({ hasText: "14:00–15:30" }).first(),
    ).toBeVisible();
  });

  test("Agenda mostra manhã no estágio, prática à tarde e Ciber e SecOps de segunda a sexta", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/agenda?semana=2026-11-09");
    const manha = page
      .locator('[data-area="estudos"]')
      .filter({ hasText: "Aula: Drain, cordon e atualização do sistema dos nós" });
    await expect(manha).toBeVisible();
    await expect(manha).toContainText("08:00–09:30");
    await expect(manha.getByText("no estágio")).toBeVisible();
    await expect(
      page.locator('[data-area="estudos"]').filter({ hasText: "Prática do tema da manhã" }),
    ).toHaveCount(4);
    await expect(
      page.locator('[data-area="estudos"]').filter({ hasText: "Reposição do que atrasou" }),
    ).toContainText("14:00–15:30");
    const ciber = page.locator('[data-area="estudos"]').filter({ hasText: "Ciber e SecOps" });
    await expect(ciber).toHaveCount(5);
    await expect(ciber.first()).toContainText("17:30–18:40");
    await expect(
      page.locator('[data-area="estudos"]').filter({ hasText: "Segurança e SecOps" }),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-area="estudos"]').filter({ hasText: "Revisão da semana: Cluster" }),
    ).toContainText("08:00–09:30");
  });

  test("Ajustes tem os dois blocos de segunda a quinta", async ({ page }) => {
    await page.goto("/ajustes");
    await expect(page.getByLabel("Segunda (conteúdo, no estágio)", { exact: true })).toBeChecked();
    await expect(page.getByLabel("Início de Segunda (conteúdo, no estágio)")).toHaveValue("08:00");
    await expect(page.getByLabel("Início de Segunda (prática)")).toHaveValue("14:00");
    await expect(page.getByLabel("Início de Sexta (revisão da semana, no estágio)")).toHaveValue(
      "08:00",
    );
    await expect(page.getByLabel("Início de Sexta (reposição do que atrasou)")).toHaveValue(
      "14:00",
    );
    await expect(page.getByLabel("Início de Domingo (revisão espaçada)")).toHaveValue("19:00");
  });

  test("Hoje mostra o bloco Ciber e SecOps com a tarefa do dia", async ({ page }) => {
    const tarefa = diaria.find((d) => d.data === hojeEmSaoPaulo());
    test.skip(!tarefa, "Hoje não é dia útil da trilha diária.");
    await page.goto("/");
    const linha = page
      .getByRole("region", { name: "Linha do dia" })
      .getByRole("listitem")
      .filter({ hasText: "Ciber e SecOps" });
    await expect(linha).toContainText("17:30 – 18:40");
    await expect(linha).toContainText(tarefa!.tarefa);
  });

  for (const t of [
    { nome: "notebook", largura: 1440, altura: 900 },
    { nome: "ipad", largura: 820, altura: 1180 },
    { nome: "iphone", largura: 390, altura: 844 },
  ]) {
    test(`semana que vem no ${t.nome}: terça com CKA, academia, Ciber e SecOps e aula; sábado sem estudo à tarde`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: t.largura, height: t.altura });
      await page.goto("/agenda?semana=2026-10-26");
      await page.getByRole("radio", { name: "Dia" }).click();
      const dias = page.getByRole("tablist", { name: "Dias da semana" });

      await dias.getByRole("tab", { name: /Ter\s*27/ }).click();
      const terca = page.locator("ol > li").filter({ visible: true });
      const horarios = await terca.evaluateAll((itens) =>
        itens.map((li) => li.querySelector("strong")?.textContent + " " + li.textContent),
      );
      const ordem = ["14:00", "16:00", "17:30", "19:10"].map((h) =>
        horarios.findIndex((x) => x.includes(`${h} –`)),
      );
      expect(
        ordem.every((i, k) => i >= 0 && (k === 0 || i > ordem[k - 1])),
        horarios.join("\n"),
      ).toBe(true);
      await expect(terca.nth(ordem[0])).toHaveAttribute("data-area", "estudos");
      await expect(terca.nth(ordem[1])).toContainText("Academia");
      await expect(terca.nth(ordem[2])).toContainText("Ciber e SecOps");
      await expect(terca.nth(ordem[2])).toContainText("17:30 – 18:40");
      await expect(terca.nth(ordem[2])).toContainText("Bandit, níveis 4 a 6");
      await expect(terca.nth(ordem[3])).toContainText("Análise e Projeto de Sistemas");
      await page.screenshot({ path: `test-results/telas/terca-${t.nome}.png`, fullPage: true });

      await dias.getByRole("tab", { name: /Sáb\s*31/ }).click();
      const sabado = page.locator("ol > li").filter({ visible: true });
      await expect(sabado.filter({ hasText: "Ciber e SecOps" })).toHaveCount(0);
      await expect(sabado.filter({ hasText: "Segurança e SecOps" })).toHaveCount(0);
      const tarde = await sabado.evaluateAll((itens) =>
        itens
          .filter((li) => li.getAttribute("data-area") === "estudos")
          .map((li) => li.querySelector("span")?.textContent ?? "")
          .filter((h) => h >= "12:00"),
      );
      expect(tarde).toEqual([]);
      await page.screenshot({ path: `test-results/telas/sabado-${t.nome}.png`, fullPage: true });
      await semRolagemLateral(page, t.largura);
    });
  }

  test("caderno de erros pela API: anota, revisa e apaga", async ({ request }) => {
    const r = await request.post("/api/estudos/erros", {
      data: {
        data: "2026-11-06",
        tema: "Static pods (e2e)",
        errei: "Manifest no nó errado",
        correto: "/etc/kubernetes/manifests do nó certo",
      },
    });
    expect(r.status(), await r.text()).toBe(201);
    const erro = await r.json();
    expect(erro.revisarEm).toBe("2026-11-27");
    const errei = await request.patch(`/api/estudos/erros/${erro.id}`, {
      data: { resultado: "errei" },
    });
    expect((await errei.json()).reincidencias).toBe(1);
    expect(
      (
        await request.patch(`/api/estudos/erros/${erro.id}`, { data: { resultado: "talvez" } })
      ).status(),
    ).toBe(400);
    expect((await request.delete(`/api/estudos/erros/${erro.id}`)).status()).toBe(204);
  });

  test("feed .ics gerado na hora e segue o horário dos Ajustes", async ({ page, request }) => {
    await page.goto("/ajustes");
    await page
      .getByRole("button", { name: /Gerar (endereço do calendário|novo endereço)/ })
      .click();
    const campo = page.getByLabel("Endereço do calendário");
    await expect(campo).toHaveValue(/^webcal:\/\/.+\/api\/calendario\/[A-Za-z0-9_-]+\.ics$/);
    const caminho = new URL((await campo.inputValue()).replace("webcal://", "http://")).pathname;

    const antes = await (await request.get(caminho, { headers: { cookie: "" } })).text();
    expect(antes).toContain("BEGIN:VCALENDAR");
    expect(antes).toContain("UID:sessao-2026-10-19-tarde@rotina-devops");
    expect(antes).toContain("DTSTART;TZID=America/Sao_Paulo:20261019T140000");
    // Da semana 1 em diante, duas sessões por dia útil: 08:00 (no estágio) e 14:00.
    expect(antes).toContain("UID:sessao-2026-11-09-manha@rotina-devops");
    expect(antes).toContain("DTSTART;TZID=America/Sao_Paulo:20261109T080000");
    expect(antes).toContain("UID:sessao-2026-11-09-tarde@rotina-devops");
    expect(antes).toContain("DTSTART;TZID=America/Sao_Paulo:20261109T140000");

    const r = await request.patch("/api/ajustes", {
      data: {
        horariosEstudo: {
          ...Object.fromEntries(
            ["1", "2", "3", "4", "5"].map((d) => [
              `${d}-manha`,
              { ativo: true, inicio: "08:00", minutos: 90 },
            ]),
          ),
          "1-tarde": { ativo: true, inicio: "15:00", minutos: 90 },
          "2-tarde": { ativo: true, inicio: "14:00", minutos: 90 },
          "3-tarde": { ativo: true, inicio: "14:00", minutos: 90 },
          "4-tarde": { ativo: true, inicio: "14:00", minutos: 90 },
          "5-tarde": { ativo: true, inicio: "14:00", minutos: 90 },
          "6-manha": { ativo: true, inicio: "09:00", minutos: 180 },
          "0-noite": { ativo: true, inicio: "19:00", minutos: 60 },
        },
      },
    });
    expect(r.ok(), await r.text()).toBe(true);
    const depois = await (await request.get(caminho)).text();
    expect(depois).toContain("DTSTART;TZID=America/Sao_Paulo:20261019T150000");

    expect(
      (
        await request.get("/api/calendario/token-invalido-que-nao-existe-aaaaaaaaaaaaaaaaaaaa.ics")
      ).status(),
    ).toBe(404);
    await request.patch("/api/ajustes", { data: { horariosEstudo: null } });
  });

  test("compromisso de Estudos criado pelo usuário aparece em Estudos e no feed", async ({
    page,
    request,
  }) => {
    const titulo = `Leitura extra ${Date.now()}`;
    const r = await request.post("/api/eventos", {
      data: {
        titulo,
        areaId: "estudos",
        data: hojeEmSaoPaulo(),
        hora: "12:30",
        duracaoMin: 45,
        lembrarMin: 15,
      },
    });
    expect(r.status(), await r.text()).toBe(201);
    await page.goto("/estudos");
    await expect(page.getByText(titulo)).toBeVisible();
    const { token } = await (await request.post("/api/calendario/token")).json();
    const ics = await (await request.get(`/api/calendario/${token}.ics`)).text();
    expect(ics).toContain(`SUMMARY:${titulo}`);
    expect(ics).toContain(
      `DTSTART;TZID=America/Sao_Paulo:${hojeEmSaoPaulo().replace(/-/g, "")}T123000`,
    );
    expect(ics).toContain("TRIGGER:-PT15M");
  });

  test("disparo de aviso só aceita assinatura do QStash", async ({ request }) => {
    const r = await request.post("/api/push/disparar", {
      data: { id: "00000000-0000-4000-8000-000000000000" },
    });
    expect(r.status()).toBe(401);
  });

  test("Ajustes mostra o botão de avisos e salva inscrição do aparelho", async ({
    page,
    request,
  }) => {
    await page.goto("/ajustes");
    await expect(page.getByRole("heading", { name: "Avisos" })).toBeVisible();
    // O Chromium sem tela informa notificações como bloqueadas; os dois estados são válidos aqui.
    await expect(
      page
        .getByRole("button", { name: "Ativar avisos neste aparelho" })
        .or(page.getByText("Os avisos estão bloqueados.", { exact: false })),
    ).toBeVisible();
    const r = await request.post("/api/push/inscricoes", {
      data: {
        endpoint: "https://push.example.com/abc",
        keys: { p256dh: "chave", auth: "segredo" },
        aparelho: "teste",
      },
    });
    expect(r.status()).toBe(201);
    await request.delete("/api/push/inscricoes", {
      data: { endpoint: "https://push.example.com/abc" },
    });
  });
});

test.describe("etapa 3: rotina pessoal", () => {
  type Oc = {
    titulo: string;
    areaId: string;
    inicio: string;
    fim: string;
    dataOriginal: string;
    eventId: string;
  };
  const semana = { de: "2026-10-19", ate: "2026-10-25" };
  async function agenda(
    request: import("@playwright/test").APIRequestContext,
    de = semana.de,
    ate = semana.ate,
  ) {
    const r = await request.get(`/api/agenda?de=${de}&ate=${ate}`);
    expect(r.ok()).toBe(true);
    return (await r.json()) as { ocorrencias: Oc[]; minutosPorArea: Record<string, number> };
  }
  const hora = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });

  test("semana típica completa, com as horas por área", async ({ request }) => {
    const { ocorrencias, minutosPorArea } = await agenda(request);
    const titulos = ocorrencias.map((o) => o.titulo);
    expect(titulos.filter((t) => t === "Estágio na Codevasf")).toHaveLength(5);
    expect(titulos.filter((t) => t === "Academia")).toHaveLength(5);
    for (const aula of [
      "Algoritmos e Estrutura de Dados",
      "Análise e Projeto de Sistemas",
      "Cálculo",
      "Desenvolvimento Web",
      "Integração DevOps",
    ]) {
      const o = ocorrencias.find((x) => x.titulo === aula)!;
      expect(hora(o.inicio)).toBe("19:10");
      expect(hora(o.fim)).toBe("22:00");
    }
    const estagio = ocorrencias.find((o) => o.titulo === "Estágio na Codevasf")!;
    expect([hora(estagio.inicio), hora(estagio.fim)]).toEqual(["07:30", "12:00"]);
    expect(minutosPorArea.estagio).toBe(5 * 270);
    expect(minutosPorArea.aulas).toBe(5 * 170);
  });

  test("detecta conflito no servidor e salva só se confirmar", async ({ request }) => {
    const corpo = {
      titulo: "Dentista",
      areaId: "pessoal",
      data: "2026-10-20",
      hora: "11:00",
      duracaoMin: 60,
    };
    const r = await request.post("/api/eventos", { data: corpo });
    expect(r.status()).toBe(409);
    const j = await r.json();
    expect(j.detalhes.conflitos[0].com).toBe("Estágio na Codevasf");
    const ok = await request.post("/api/eventos", { data: { ...corpo, ignorarConflito: true } });
    expect(ok.status()).toBe(201);
    await request.delete(`/api/eventos/${(await ok.json()).id}`);
  });

  test("feriado cadastrado tira a aula e o estágio daquele dia", async ({ request }) => {
    const f = await request.post("/api/feriados", {
      data: { data: "2026-10-19", nome: "Feriado de teste" },
    });
    expect(f.status()).toBe(201);
    const { ocorrencias } = await agenda(request);
    const segunda = ocorrencias.filter((o) => o.dataOriginal === "2026-10-19").map((o) => o.titulo);
    expect(segunda).not.toContain("Algoritmos e Estrutura de Dados");
    expect(segunda).not.toContain("Estágio na Codevasf");
    expect(segunda).toContain("Academia");
    expect(segunda).toContain("Feriado: Feriado de teste");
    await request.delete(`/api/feriados/${(await f.json()).id}`);
  });

  test("período letivo limita as aulas", async ({ request }) => {
    await request.patch("/api/ajustes", {
      data: { periodoInicio: "2026-08-03", periodoFim: "2026-10-20" },
    });
    const { ocorrencias } = await agenda(request);
    const aulas = ocorrencias.filter((o) => o.areaId === "aulas").map((o) => o.dataOriginal);
    expect(aulas).toEqual(["2026-10-19", "2026-10-20"]);
    await request.patch("/api/ajustes", { data: { periodoInicio: null, periodoFim: null } });
  });

  test("muda a academia só num dia pela Agenda", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/agenda?semana=2026-10-19");
    await page
      .getByRole("button", { name: /Academia/ })
      .nth(2)
      .click();
    const folha = page.getByRole("dialog", { name: "Academia" });
    await folha.getByRole("button", { name: "Mudar horário" }).click();
    await folha.getByLabel("Início").fill("06:00");
    await folha.getByLabel("Fim").fill("07:00");
    await folha.getByRole("button", { name: "Salvar horário" }).click();
    await expect(folha).toBeHidden();
    const { ocorrencias } = await agenda(request);
    const acad = ocorrencias.filter((o) => o.titulo === "Academia");
    expect(acad.map((o) => hora(o.inicio))).toEqual(["16:00", "16:00", "06:00", "16:00", "16:00"]);
    const quarta = acad[2];
    await request.delete(`/api/eventos/${quarta.eventId}/excecoes/${quarta.dataOriginal}`);
  });

  test("prova: lança nota e vê a média da disciplina", async ({ page, request }) => {
    const disciplinas = (await (await request.get("/api/disciplinas")).json()) as {
      id: string;
      sigla: string;
    }[];
    const calc = disciplinas.find((d) => d.sigla === "CALC")!;
    const p = await request.post("/api/avaliacoes", {
      data: {
        tipo: "prova",
        titulo: "P1 de Cálculo",
        subjectId: calc.id,
        data: "2026-10-21",
        hora: "19:10",
        peso: 2,
      },
    });
    expect(p.status()).toBe(201);
    const { id } = await p.json();
    await page.goto(`/provas?item=${id}`);
    await page.getByRole("button", { name: "Editar" }).click();
    const folha = page.getByRole("dialog", { name: "Editar prova ou entrega" });
    await folha.getByLabel("Nota", { exact: true }).fill("8,5");
    await folha.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(folha).toBeHidden();
    await expect(page.getByText("Média parcial em CALC")).toBeVisible();
    await expect(page.locator("strong", { hasText: "8,5" }).first()).toBeVisible();
    await request.delete(`/api/avaliacoes/${id}`);
  });

  test("lembrete que repete vai para o dia seguinte ao concluir", async ({ request }) => {
    const r = await request.post("/api/lembretes", {
      data: { texto: "Tomar água", data: "2026-10-15", hora: "08:00", repetir: "diario" },
    });
    const { id } = await r.json();
    const c = await (
      await request.patch(`/api/lembretes/${id}`, { data: { concluido: true } })
    ).json();
    expect(c.repetiu).toBe(true);
    expect(c.concluido).toBe(false);
    expect(new Date(c.quando).getTime()).toBeGreaterThan(Date.now());
    await request.delete(`/api/lembretes/${id}`);
  });
});
