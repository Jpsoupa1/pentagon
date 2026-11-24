import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { criarSessaoDeOutroUsuario, EMAIL_FORA_DO_PLANO } from "./sessao";

// Os testes seguem o mesmo dono do começo ao fim: a primeira abertura acontece uma vez só.
test.describe.configure({ mode: "serial" });

const ATUAL_A3 = "Item atual: A3. Cálculo de várias variáveis";
const ATUAL_A4 = "Item atual: A4. Probabilidade";

test("primeira abertura: A0 e C1 marcados, requisito faltando e a tela não volta", async ({
  page,
}) => {
  // Antes da primeira abertura o Hoje só convida; não há blocos nem pergunta da folga.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Comece o plano" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Blocos de hoje" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Hoje tem folga no estágio?" })).toHaveCount(0);
  await page.getByRole("link", { name: "Comece o plano" }).click();
  await expect(page).toHaveURL(/\/plano\/inicio$/);

  await page.goto("/plano");
  await expect(page).toHaveURL(/\/plano\/inicio$/);
  await expect(
    page.getByText("Marque o que você já concluiu. O resto será liberado um de cada vez."),
  ).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /^A0\./ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /^C1\./ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /^A1\./ })).not.toBeChecked();

  // A2 pede A1: o app lista o que falta antes de gravar qualquer coisa.
  await page.getByRole("checkbox", { name: /^A2\./ }).check();
  await page.getByRole("button", { name: "Salvar e começar" }).click();
  await expect(page.getByText("Faltam requisitos dos itens marcados:")).toBeVisible();
  await expect(page.getByRole("alert").getByRole("listitem")).toHaveText(["A1. Álgebra linear"]);
  await expect(page).toHaveURL(/\/plano\/inicio$/);

  await page.getByRole("button", { name: "Marcar junto" }).click();
  await expect(page).toHaveURL(/\/plano$/);
  await expect(page.getByRole("heading", { name: "Plano", level: 1 })).toBeVisible();

  // Depois de iniciado, a primeira abertura não volta.
  await page.goto("/plano/inicio");
  await expect(page).toHaveURL(/\/plano$/);
});

test("três trilhas na ordem, concluir com aviso de liberação e desfazer", async ({ page }) => {
  await page.goto("/plano");
  await expect(page.getByRole("link", { name: "Plano", exact: true }).first()).toBeVisible();
  await expect(page.locator('section[aria-labelledby^="trilha-"] h2')).toHaveText([
    "Teoria",
    "Cursos e Certificações",
    "Projetos",
  ]);

  const teoria = page.getByRole("article", { name: ATUAL_A3 });
  await expect(teoria).toBeVisible();
  await expect(teoria.getByText("Fase 1: Matemática")).toBeVisible();
  await expect(page.getByRole("article", { name: /^Item atual: B1\./ })).toBeVisible();
  await expect(page.getByRole("article", { name: /^Item atual: C2\./ })).toBeVisible();

  // Os próximos mostram só código e título, sem botão.
  await expect(page.getByRole("listitem").filter({ hasText: /^A5\. / })).toBeVisible();

  await teoria.getByRole("button", { name: /^Concluir A3/ }).click();
  const folha = page.getByRole("dialog");
  await expect(folha.getByRole("heading", { name: "Critério de conclusão" })).toBeVisible();
  // Sem a confirmação, o botão não envia.
  await expect(folha.getByRole("button", { name: "Concluir", exact: true })).toBeDisabled();
  await folha.getByRole("checkbox", { name: "Cumpri o critério de conclusão" }).check();
  await folha.getByRole("button", { name: "Concluir", exact: true }).click();

  const aviso = page.getByRole("status").filter({ hasText: "Concluído: A3." });
  await expect(aviso).toContainText("Próximo conteúdo liberado: A4. Probabilidade");
  await expect(page.getByRole("article", { name: ATUAL_A4 })).toBeVisible();
  await expect(page.getByRole("article", { name: ATUAL_A3 })).toHaveCount(0);

  // Desfazer volta ao estado anterior.
  await page
    .getByText(/^Concluídos \(/)
    .first()
    .click();
  await page.getByRole("button", { name: /^Desfazer A3/ }).click();
  await expect(page.getByRole("article", { name: ATUAL_A3 })).toBeVisible();
  await expect(page.getByRole("article", { name: ATUAL_A4 })).toHaveCount(0);

  // Conclui de novo para o próximo teste partir de A4.
  await page.getByRole("button", { name: /^Concluir A3/ }).click();
  await page.getByRole("checkbox", { name: "Cumpri o critério de conclusão" }).check();
  await page.getByRole("dialog").getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(page.getByRole("article", { name: ATUAL_A4 })).toBeVisible();
});

test("nota abaixo da mínima registra a tentativa e o item continua atual; recusa vira mensagem", async ({
  page,
}) => {
  await page.goto("/plano");
  await page.getByRole("button", { name: /^Concluir A4/ }).click();
  const folha = page.getByRole("dialog");
  await folha.getByRole("checkbox", { name: "Cumpri o critério de conclusão" }).check();
  await folha.getByLabel("Nota (0 a 100)").fill("72");
  await folha.getByRole("button", { name: "Concluir", exact: true }).click();

  await expect(
    folha.getByText("Tentativa registrada: 72%. Para passar, 80% ou mais."),
  ).toBeVisible();
  await folha.getByRole("button", { name: "Fechar" }).click();
  const atual = page.getByRole("article", { name: ATUAL_A4 });
  await expect(atual).toBeVisible();
  await expect(atual.getByText("72%")).toBeVisible();

  // Qualquer recusa 409 aparece como mensagem, sem quebrar a tela.
  await page.route("**/api/plano/itens/A4/concluir", (r) =>
    r.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        erro: "Aguardando: A1. Álgebra linear.",
        motivo: "requisito_pendente",
      }),
    }),
  );
  await page.getByRole("button", { name: /^Concluir A4/ }).click();
  await folha.getByRole("checkbox", { name: "Cumpri o critério de conclusão" }).check();
  await folha.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(folha.getByText("Aguardando: A1. Álgebra linear.")).toBeVisible();
  await folha.getByRole("button", { name: "Fechar" }).click();
  await expect(atual).toBeVisible();
  await page.unroute("**/api/plano/itens/A4/concluir");

  // Sem conexão a nota não vai para a fila: avisa e não grava nada.
  await page.context().setOffline(true);
  await page.getByRole("button", { name: /^Concluir A4/ }).click();
  await folha.getByLabel("Nota (0 a 100)").fill("55");
  await folha.getByRole("button", { name: "Registrar só a nota" }).click();
  await expect(
    folha.getByText("Sem conexão. Tente de novo quando a internet voltar."),
  ).toBeVisible();
  await page.context().setOffline(false);
  await page.reload();
  await expect(page.getByRole("article", { name: ATUAL_A4 })).toBeVisible();
  await expect(page.getByRole("article", { name: ATUAL_A4 }).getByText("55%")).toHaveCount(0);
  await expect(page.getByRole("article", { name: ATUAL_A4 }).getByText("72%")).toBeVisible();
});

test("recrutamento só aparece quando o estado traz; trilhas arquivadas abre a lista vazia", async ({
  page,
}) => {
  await page.goto("/plano");
  await expect(page.getByRole("heading", { name: "Recrutamento" })).toHaveCount(0);

  // O recrutamento depende de B5 e C8. Aqui só a tela é exercitada: a resposta do servidor
  // recebe o bloco, como se as duas trilhas estivessem concluídas.
  const recrutamento = (feitas: number) => ({
    checklist: [{ texto: "LinkedIn atualizado com badges e projetos", feito: false }],
    contadores: [{ chave: "questoes", titulo: "Questões de programação", metaSemanal: 2, feitas }],
  });
  let estado: Record<string, unknown> = {};
  await page.route("**/api/plano/checks", async (r) => {
    const resposta = await r.fetch();
    estado = (await resposta.json()).plano;
    await r.fulfill({ json: { plano: { ...estado, recrutamento: recrutamento(1) } } });
  });
  await page.route("**/api/plano/contadores/questoes", (r) =>
    r.fulfill({ json: { plano: { ...estado, recrutamento: recrutamento(2) } } }),
  );

  const projetos = page.getByRole("article", { name: /^Item atual: C2\./ });
  // Sem atualização otimista: a caixa só muda com o estado que volta do servidor.
  await projetos.getByRole("checkbox", { name: /^Pedir a autorização/ }).click();
  await expect(page.getByRole("heading", { name: "Recrutamento" })).toBeVisible();
  await expect(page.getByText("Questões de programação: 1 de 2 nesta semana")).toBeVisible();

  await page.getByRole("button", { name: "Registrar mais uma: Questões de programação" }).click();
  await expect(page.getByText("Questões de programação: 2 de 2 nesta semana")).toBeVisible();

  await page.getByRole("link", { name: "Trilhas arquivadas" }).click();
  await expect(page).toHaveURL(/\/plano\/arquivadas$/);
  await expect(page.getByText("Nenhuma trilha arquivada.")).toBeVisible();
});

// A folga só vale em dia útil; as respostas vão pela API para o teste não depender da hora do dia.
const diaDaSemanaEmSaoPaulo = () =>
  new Date(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()) +
      "T12:00:00Z",
  ).getUTCDay();

test("Hoje: a folga mostra e esconde o bloco da manhã, e o bloco feito pode ser desmarcado", async ({
  page,
}) => {
  test.skip([0, 6].includes(diaDaSemanaEmSaoPaulo()), "A folga só existe em dia útil.");
  await page.request.put("/api/plano/folga", { data: { minutos: 0 } });
  await page.goto("/");
  const blocos = page.getByRole("region", { name: "Blocos de hoje" });
  await expect(page.getByRole("heading", { name: "Hoje tem folga no estágio?" })).toBeVisible();
  await expect(blocos.getByText("Manhã:")).toHaveCount(0);
  await expect(blocos.getByText("Teoria:")).toBeVisible();

  await page.getByRole("button", { name: "2 h" }).click();
  await expect(blocos.getByText("Manhã:")).toBeVisible();
  await expect(blocos.getByText("B1. Building with the Claude API")).toBeVisible();
  await expect(blocos.getByRole("link", { name: /^Abrir Manhã/ })).toHaveAttribute(
    "href",
    "/plano#trilha-cursos",
  );

  await page.getByRole("button", { name: "Nada" }).click();
  await expect(blocos.getByText("Manhã:")).toHaveCount(0);

  await blocos.getByRole("button", { name: /^Fiz este bloco: Teoria/ }).click();
  await expect(blocos.getByRole("button", { name: /^Desmarcar Teoria/ })).toBeVisible();
  await blocos.getByRole("button", { name: /^Desmarcar Teoria/ }).click();
  await expect(blocos.getByRole("button", { name: /^Fiz este bloco: Teoria/ })).toBeVisible();
});

test("Hoje: trilha aguardando mostra 'Aguardando' com o plano B", async ({ page }) => {
  test.skip([0, 6].includes(diaDaSemanaEmSaoPaulo()), "A folga só existe em dia útil.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const feitos = ["B1", "B2", "B3", "B4", "B5"];
  const donoDe = "(select id from users where email = 'teste@pentagon.local')";
  try {
    // B6 pede A8: com B1 a B5 concluídos, Cursos fica aguardando.
    await pool.query(
      `insert into plano_progresso (user_id, codigo, concluido_em)
       select ${donoDe}, c, now() from unnest($1::text[]) c`,
      [feitos],
    );
    await page.request.put("/api/plano/folga", { data: { minutos: 120 } });
    await page.goto("/");
    const blocos = page.getByRole("region", { name: "Blocos de hoje" });
    await expect(blocos.getByText(/Aguardando: B6\..* Plano B: A4\. Probabilidade/)).toBeVisible();
  } finally {
    await pool.query(
      `delete from plano_progresso where user_id = ${donoDe} and codigo = any($1::text[])`,
      [feitos],
    );
    await page.request.put("/api/plano/folga", { data: { minutos: 0 } });
    await pool.end();
  }
});

test("Ajustes recusa horário 25:00 e minutos 0 ou 500 com 400", async ({ page }) => {
  const patch = (t: object) =>
    page.request.patch("/api/ajustes", { data: { blocosPlano: { dias_uteis: { teoria: t } } } });
  expect((await patch({ inicio: "25:00", minutos: 90 })).status()).toBe(400);
  expect((await patch({ inicio: "13:30", minutos: 0 })).status()).toBe(400);
  expect((await patch({ inicio: "13:30", minutos: 500 })).status()).toBe(400);
});

test("conta fora do OWNER_EMAILS não vê o plano nem a entrada no menu", async ({ browser }) => {
  const estado = await criarSessaoDeOutroUsuario(process.env.DATABASE_URL!, EMAIL_FORA_DO_PLANO);
  const contexto = await browser.newContext({ storageState: estado });
  const page = await contexto.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Blocos de hoje" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Comece o plano" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Hoje tem folga no estágio?" })).toHaveCount(0);
  for (const caminho of ["/plano", "/plano/inicio", "/plano/arquivadas"]) {
    await page.goto(caminho);
    await expect(page).toHaveURL(new RegExp(`${caminho}$`));
    await expect(page.getByText("Nenhum plano de estudos nesta conta.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Plano", exact: true })).toHaveCount(0);
  }
  await contexto.close();
});
