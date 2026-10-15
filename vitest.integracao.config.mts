import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Testes de integração: banco de verdade (DATABASE_URL local ou do CI), API do Claude simulada. */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/vazio.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integracao/**/*.test.ts"],
    setupFiles: ["./scripts/env.ts"],
    env: { TZ: "UTC" },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
