import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { ESTADO_AMIGO } from "./sessao";

// O dono (teste@pentagon.local) tem o Plano no lugar de Estudos e Trilhas; a conta fora do
// OWNER_EMAILS (amigo@pentagon.local) mantém o menu e as telas de antes.

const TELAS = [
  { nome: "iphone", largura: 390, altura: 844 },
  { nome: "ipad vertical", largura: 820, altura: 1180 },
  { nome: "notebook 1180", largura: 1180, altura: 820 },
  { nome: "notebook 1440", largura: 1440, altura: 900 },
];

for (const t of TELAS) {
  test(`dono, ${t.nome}: o menu tem Plano e Cards, sem Estudos nem Trilhas`, async ({ page }) => {
    await page.setViewportSize({ width: t.largura, height: t.altura });
    await page.goto("/agenda");
    const menu = page.getByRole("navigation", { name: "Principal" }).filter({ visible: true });
    await expect(menu).toHaveCount(1);
    await expect(menu.getByRole("link", { name: /^Plano/ })).toHaveCount(1);
    await expect(menu.getByRole("link", { name: /^Estudos/ })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: /^Trilhas/ })).toHaveCount(0);
    // No iPhone e no iPad vertical, Cards fica em "Áreas" ou "Mais".
    if (t.largura >= 1180) {
      await expect(menu.getByRole("link", { name: /^Cards/ })).toHaveCount(1);
    }
  });
}

test("dono, iPhone: a página Áreas lista Plano e Cards, sem Trilhas", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/areas");
  const mais = page.getByRole("region", { name: "Mais" });
  await expect(mais.getByRole("link", { name: "Plano" })).toHaveAttribute("href", "/plano");
  await expect(mais.getByRole("link", { name: "Cards" })).toBeVisible();
  await expect(mais.getByRole("link", { name: "Trilhas" })).toHaveCount(0);
});

for (const caminho of ["/estudos", "/trilhas", "/trilhas/devops/roadmap"]) {
  test(`dono: ${caminho} vai para /plano`, async ({ page }) => {
    await page.goto(caminho);
    // O /plano leva ao /plano/inicio enquanto a primeira abertura não aconteceu.
    await expect(page).toHaveURL(/\/plano(\/inicio)?$/);
  });
}

test.describe("conta fora do OWNER_EMAILS", () => {
  test.use({ storageState: ESTADO_AMIGO });

  test("mantém Estudos e Trilhas no menu e abre as telas de antes", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/agenda");
    const menu = page.getByRole("navigation", { name: "Principal" }).filter({ visible: true });
    await expect(menu.getByRole("link", { name: /^Estudos/ })).toHaveCount(1);
    await expect(menu.getByRole("link", { name: /^Trilhas/ })).toHaveCount(1);
    await expect(menu.getByRole("link", { name: /^Plano/ })).toHaveCount(0);
    for (const caminho of ["/estudos", "/trilhas"]) {
      await page.goto(caminho);
      await expect(page).toHaveURL(new RegExp(`${caminho}$`));
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("não vê Trilhas arquivadas: o plano não existe nesta conta", async ({ page }) => {
    await page.goto("/plano/arquivadas");
    await expect(page.getByText("Nenhum plano de estudos nesta conta.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Trilhas arquivadas" })).toHaveCount(0);
  });

  test("importar cards de qualquer trilha continua valendo", async ({ request }) => {
    const r = await request.post("/api/cards/importar", {
      data: {
        cards: [
          {
            id: "amigo-cka-001",
            trilha: "CKA",
            tema: "Rede",
            frente: "Frente",
            verso: "Verso",
            origem: "aula",
            criado_em: "2026-11-24",
          },
        ],
      },
    });
    expect(r.status()).toBe(201);
  });
});

test("dono: importar cards com a trilha CKA dá 400 e com TEORIA entra", async ({ request }) => {
  const card = (trilha: string) => ({
    id: `menu-${trilha.toLowerCase()}-001`,
    trilha,
    tema: "Rede",
    frente: "Frente",
    verso: "Verso",
    origem: "aula",
    criado_em: "2026-11-24",
  });
  const recusado = await request.post("/api/cards/importar", { data: { cards: [card("CKA")] } });
  expect(recusado.status()).toBe(400);
  expect((await recusado.json()).erro).toBe("Use a trilha TEORIA, CURSOS ou PROJETOS.");

  const aceito = await request.post("/api/cards/importar", { data: { cards: [card("TEORIA")] } });
  expect(aceito.status()).toBe(201);
  expect((await aceito.json()).importados).toBe(1);
});

test("dono: Trilhas arquivadas lista os itens com nome e data, sem ação de reativar", async ({
  page,
}) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const dono = "(select id from users where email = 'teste@pentagon.local')";
  try {
    await pool.query(
      `insert into arquivamentos (user_id, tipo, chave, arquivado_em)
       select ${dono}, v.tipo::arquivamento_tipo, v.chave, '2026-11-25T02:30:00Z'::timestamptz
       from (values ('cards', 'CKA'), ('roadmap', 'seguranca'), ('erros', 'antes_do_plano')) as v(tipo, chave)
       on conflict do nothing`,
    );
    await page.goto("/plano/arquivadas");
    await expect(page.getByRole("heading", { name: "Trilhas arquivadas" })).toBeVisible();
    const lista = page.getByRole("region", { name: "Itens arquivados" });
    const itens = lista.getByRole("listitem");
    await expect(itens).toHaveCount(3);
    await expect(itens.nth(0)).toContainText(/^Roadmap Segurança/);
    await expect(itens.nth(1)).toContainText("Cards CKA");
    await expect(itens.nth(2)).toContainText("Erros anteriores ao plano");
    // 02:30 UTC de 25/11 ainda é dia 24 em São Paulo.
    await expect(lista.getByText("arquivado em 24 de novembro")).toHaveCount(3);
    await expect(lista.getByRole("button")).toHaveCount(0);
    await expect(lista.getByRole("link")).toHaveCount(0);
  } finally {
    await pool.query(
      `delete from arquivamentos where user_id = ${dono} and chave = any($1::text[])`,
      [["CKA", "seguranca", "antes_do_plano"]],
    );
    await pool.end();
  }
});
