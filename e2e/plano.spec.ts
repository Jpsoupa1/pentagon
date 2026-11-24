import { expect, test } from "@playwright/test";

// Os testes seguem o mesmo dono do começo ao fim: a primeira abertura acontece uma vez só.
test.describe.configure({ mode: "serial" });

const ATUAL_A3 = "Item atual: A3. Cálculo de várias variáveis";
const ATUAL_A4 = "Item atual: A4. Probabilidade";

test("primeira abertura: A0 e C1 marcados, requisito faltando e a tela não volta", async ({
  page,
}) => {
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
