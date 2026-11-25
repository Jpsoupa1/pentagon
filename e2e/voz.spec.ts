import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { criarSessaoDeOutroUsuario, EMAIL_FORA_DO_PLANO } from "./sessao";

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

// ---------------------------------------------------------------- Plano de estudos por voz

test.describe("Voz e plano de estudos", () => {
  test.describe.configure({ mode: "serial" });

  type Pagina = Page;

  const salvarBlocos = (page: Pagina, blocosPlano: object | null) =>
    page.request.patch("/api/ajustes", { data: { blocosPlano } });
  const dia = (ligado: boolean, inicio = "08:00") => ({
    manha: { inicio: "08:00", ligado: false },
    teoria: { inicio, minutos: 90, ligado },
    projeto: { inicio: "17:20", ligado: false },
  });
  /** Nenhum bloco hoje: o conteúdo do momento não existe e o assistente pergunta qual. */
  const semBlocos = (page: Pagina) =>
    salvarBlocos(page, { dias_uteis: dia(false), sabado: dia(false), domingo: dia(false) });
  const perguntar = (page: Pagina, texto: string) =>
    page.goto(`/voz?texto=${encodeURIComponent(texto)}`);

  test.beforeEach(async ({ page }) => {
    // O plano precisa estar aberto (se outro teste já abriu, a resposta é 409 e tudo bem).
    const r = await page.request.post("/api/plano/inicio", { data: { marcados: ["A0", "C1"] } });
    expect([200, 201, 409]).toContain(r.status());
  });

  test("sem blocos hoje: o app responde o atual de cada trilha e o próximo conteúdo", async ({
    page,
  }) => {
    await semBlocos(page);
    try {
      await perguntar(page, "o que eu estudo agora?");
      await expect(page.getByRole("heading", { name: "Plano de estudos" })).toBeVisible();
      await expect(
        page.getByText(
          /^Sem blocos no resto de hoje\. Itens atuais: Teoria: A\d+\. .+ Cursos e Certificações: .+ Projetos: /,
        ),
      ).toBeVisible();

      await perguntar(page, "qual o próximo conteúdo?");
      await expect(
        page.getByText(/Próximo conteúdo na trilha Teoria, depois de A\d+\./),
      ).toBeVisible();
    } finally {
      await salvarBlocos(page, null);
    }
  });

  test("com o bloco da Teoria em andamento, a resposta traz o bloco, o conteúdo e as horas", async ({
    page,
  }) => {
    const partes = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    })
      .format(new Date(Date.now() - 10 * 60_000))
      .split(":");
    const minutos = Number(partes[0]) * 60 + Number(partes[1]);
    test.skip(
      minutos >= 23 * 60 + 50,
      "Perto da meia-noite o início do bloco cai no dia anterior.",
    );
    const inicio = `${partes[0]}:${partes[1]}`;
    try {
      await salvarBlocos(page, {
        dias_uteis: dia(true, inicio),
        sabado: dia(true, inicio),
        domingo: dia(true, inicio),
      });
      await perguntar(page, "o que eu estudo agora?");
      await expect(
        page.getByText(/^Agora: bloco Teoria, A\d+\. .+\. [\d,]+ h restantes de [\d,]+ h\.$/),
      ).toBeVisible();
    } finally {
      await salvarBlocos(page, null);
    }
  });

  test("sem bloco e sem trilha: escolhe entre os atuais, e o Confirmar conclui e o Desfazer volta", async ({
    page,
  }) => {
    await semBlocos(page);
    try {
      await perguntar(page, "terminei o conteúdo atual");
      await expect(
        page.getByRole("heading", { name: "Preciso da sua confirmação." }),
      ).toBeVisible();
      const cartao = page.getByRole("article", { name: "Qual conteúdo você terminou?" });
      await expect(cartao.getByText("CONCLUIR?")).toBeVisible();
      await expect(cartao.getByRole("radio")).toHaveCount(3);
      // Sem escolha o botão não envia, e a proposta não concluiu nada.
      await expect(cartao.getByRole("button", { name: "Confirmar" })).toBeDisabled();
      await page.goto("/plano");
      await expect(page.getByRole("article", { name: /^Item atual: B1\./ })).toBeVisible();
      await page.goBack();

      await cartao.getByRole("radio", { name: /^B1\./ }).check();
      await cartao.getByRole("button", { name: "Confirmar" }).click();
      const feita = page.getByRole("article", { name: /^B1\./ });
      await expect(feita.getByText("CONCLUÍDO", { exact: true })).toBeVisible();
      await page.goto("/plano");
      await expect(page.getByRole("article", { name: /^Item atual: B1\./ })).toHaveCount(0);

      await page.goBack();
      await page
        .getByRole("article", { name: /^B1\./ })
        .getByRole("button", { name: "Desfazer" })
        .click();
      await expect(page.getByText("Desfeito")).toBeVisible();
      await page.goto("/plano");
      await expect(page.getByRole("article", { name: /^Item atual: B1\./ })).toBeVisible();
    } finally {
      await salvarBlocos(page, null);
    }
  });

  test("terminei a prova com 72 na trilha teoria: vira tentativa e o cartão continua aberto", async ({
    page,
  }) => {
    // Garante um item de Teoria com prova por nota como atual (A1 feito deixa A2, mínima 80).
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const { rows } = await pool.query(
      `insert into plano_progresso (user_id, codigo, concluido_em)
       select id, 'A1', now() from users where email = 'teste@pentagon.local'
       on conflict do nothing returning codigo`,
    );
    try {
      await perguntar(page, "terminei a prova com 72 na trilha teoria");
      const cartao = page.getByRole("article", { name: /^Concluir A\d+\./ });
      await expect(cartao.getByText("Nota dita")).toBeVisible();
      await expect(cartao.getByText("72%")).toBeVisible();
      await cartao.getByRole("button", { name: "Confirmar" }).click();
      await expect(
        page.getByText("Tentativa registrada: 72%. Para passar, 80% ou mais.", { exact: true }),
      ).toBeVisible();
      await expect(cartao.getByRole("button", { name: "Confirmar" })).toBeVisible();
    } finally {
      if (rows.length) {
        await pool.query(
          `delete from plano_progresso where codigo = 'A1'
           and user_id = (select id from users where email = 'teste@pentagon.local')`,
        );
      }
      await pool.end();
    }
  });

  test("conta fora do plano recebe que não há plano, sem cartão", async ({ browser }) => {
    const estado = await criarSessaoDeOutroUsuario(process.env.DATABASE_URL!, EMAIL_FORA_DO_PLANO);
    const contexto = await browser.newContext({ storageState: estado });
    const page = await contexto.newPage();
    await perguntar(page, "o que eu estudo agora?");
    await expect(page.getByText("Nenhum plano de estudos nesta conta.")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
    await contexto.close();
  });

  test("me explica gradiente continua fora do escopo", async ({ page }) => {
    await perguntar(page, "me explica gradiente");
    await expect(page.getByRole("heading", { name: "Isso eu não faço." })).toBeVisible();
  });
});
