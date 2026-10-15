import { mkdirSync, writeFileSync } from "node:fs";
import "../scripts/env";
import { criarSessaoDeTeste } from "./sessao";

export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida para os testes e2e.");
  const { token } = await criarSessaoDeTeste(url);
  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync(
    "e2e/.auth/estado.json",
    JSON.stringify({
      cookies: [
        {
          name: "authjs.session-token",
          value: token,
          domain: "localhost",
          path: "/",
          expires: Math.floor(Date.now() / 1000) + 86_400,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
  );
}
