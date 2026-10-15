import { defineConfig, devices } from "@playwright/test";

const porta = Number(process.env.PORTA_E2E ?? 3100);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${porta}`,
    storageState: "e2e/.auth/estado.json",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run start -- -p ${porta}`,
    url: `http://localhost:${porta}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET ?? "segredo-de-teste-local-com-32-caracteres!",
      AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID ?? "teste",
      AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET ?? "teste",
      ALLOWED_EMAILS: process.env.ALLOWED_EMAILS ?? "teste@pentagon.local",
      AUTH_URL: `http://localhost:${porta}`,
    },
  },
});
