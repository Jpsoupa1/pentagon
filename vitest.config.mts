import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Os de integração precisam do banco: rodam com `npm run test:integracao`.
    exclude: ["tests/integracao/**", "node_modules/**"],
    env: { TZ: "UTC" },
  },
});
