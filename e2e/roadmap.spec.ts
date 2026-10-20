import { expect, test, type Page } from "@playwright/test";

const URL = "/trilhas/devops/roadmap";

async function semRolagemHorizontal(page: Page) {
  const { largura, conteudo } = await page.evaluate(() => ({
    largura: window.innerWidth,
    conteudo: document.documentElement.scrollWidth,
  }));
  expect(conteudo).toBeLessThanOrEqual(largura);
}

test("Roadmap no notebook: mapa, portão, requisito e prática com volta atrás se falhar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto(URL);
  await expect(
    page.getByRole("heading", { name: "Do primeiro pod à primeira vaga" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Trilhas", exact: true }).first()).toBeVisible();
  await semRolagemHorizontal(page);

  // O seed já marca 2 dos 14 requisitos da fase 1.
  const portao = page.getByRole("region", { name: /Fase 1: Kubernetes/ });
  await expect(portao.getByRole("heading", { name: /^CKA Certified/ })).toBeVisible();
  await expect(portao.getByText("2/14")).toBeVisible();

  // Marca e persiste.
  const req = portao.getByRole("button", { name: "Revisão das semanas 1 e 2" });
  await expect(req).toHaveAttribute("aria-pressed", "false");
  await req.click();
  await expect(req).toHaveAttribute("aria-pressed", "true");
  await expect(portao.getByText("3/14")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(page.getByRole("button", { name: "Revisão das semanas 1 e 2" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Servidor recusa: volta ao estado anterior e avisa.
  await page.route("**/roadmap/requisitos/**", (r) =>
    r.fulfill({ status: 500, contentType: "application/json", body: '{"erro":"Falhou."}' }),
  );
  const outro = page.getByRole("button", { name: "Security e RBAC" });
  await outro.click();
  await expect(
    page.getByRole("alert").filter({ hasText: 'Não deu para marcar "Security e RBAC"' }),
  ).toBeVisible();
  await expect(outro).toHaveAttribute("aria-pressed", "false");
  await page.unroute("**/roadmap/requisitos/**");
  await page.getByRole("button", { name: "Revisão das semanas 1 e 2" }).click();

  // Prática: soma, persiste e desfaz.
  await page.getByRole("tab", { name: /Prática/ }).click();
  await page.getByRole("button", { name: "Registrar mais um: Drills das lacunas" }).click();
  const drills = page.getByRole("listitem").filter({ hasText: "Drills das lacunas" });
  await expect(drills).toContainText("1/3");
  await page.waitForLoadState("networkidle");
  await page.reload();
  await page.getByRole("tab", { name: /Prática/ }).click();
  await expect(drills).toContainText("1/3");
  await page
    .getByRole("button", { name: "Desfazer o último registro de Drills das lacunas" })
    .click();
  await expect(drills).toContainText("0/3");

  // Cursos: filtro de preço.
  await page.getByRole("tab", { name: /Cursos/ }).click();
  await page.getByRole("button", { name: "Pagos · 2" }).click();
  await expect(page.getByRole("link", { name: /Abrir/ })).toHaveCount(2);

  // Estação 3 do mapa: domínios sem peso oficial aparecem como objetivo.
  await page.getByRole("button", { name: /^3\s*Terraform/ }).click();
  await expect(
    page.getByRole("heading", { name: "Infraestrutura como Código", level: 2 }),
  ).toBeVisible();
  await expect(page.getByText("objetivo", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /Provas e simulados/ }).click();
  await expect(page.getByText("Prova Terraform Associate")).toBeVisible();

  // "Ver o que falta" volta para a fase atual.
  await page.getByRole("button", { name: "Ver o que falta" }).click();
  await expect(page.getByRole("region", { name: /Fase 1: Kubernetes/ })).toBeVisible();
});

test("Roadmap no iPhone e no iPad: uma coluna, pílulas e só 5 requisitos de início", async ({
  page,
}) => {
  for (const largura of [390, 820]) {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto(URL);
    await expect(page.getByRole("heading", { name: "Roadmap", level: 1 })).toBeVisible();
    await semRolagemHorizontal(page);
    const fases = page.getByRole("group", { name: "Fases da trilha" });
    await expect(fases.getByRole("button")).toHaveCount(4);
    const portao = page.getByRole("region", { name: /Fase 1: Kubernetes/ });
    await expect(portao.locator("li button[aria-pressed]:visible")).toHaveCount(5);
    await portao.getByRole("button", { name: "Ver os 14 requisitos" }).click();
    await expect(portao.locator("li button[aria-pressed]:visible")).toHaveCount(14);
    await fases.getByRole("button", { name: /AWS e CI\/CD/ }).click();
    await expect(page.getByRole("heading", { name: "AWS e CI/CD", level: 2 })).toBeVisible();
    await page.getByRole("tab", { name: /Provas/ }).click();
    await expect(page.getByText("Prova AWS SAA")).toBeVisible();
    await semRolagemHorizontal(page);
  }
  // Na barra de abas do iPhone, "Trilhas" fica ativo.
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(URL);
  await expect(page.getByRole("link", { name: "Trilhas" }).last()).toHaveAttribute(
    "aria-current",
    "page",
  );
});
