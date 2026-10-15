// Cria um usuário e uma sessão direto no banco de teste (nunca em produção).
import { randomBytes } from "node:crypto";
import { Pool } from "pg";

export const EMAIL_TESTE = "teste@pentagon.local";

export async function criarSessaoDeTeste(url: string) {
  if (/neon\.tech|vercel/.test(url)) throw new Error("Recusado: banco parece ser de produção.");
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const { rows } = await pool.query(
      `insert into users (id, name, email) values ($1, $2, $3)
       on conflict (email) do update set name = excluded.name returning id`,
      [crypto.randomUUID(), "João Pedro Souza", EMAIL_TESTE],
    );
    const userId = rows[0].id as string;
    // Limpa dados de execuções anteriores para cada rodada começar do zero.
    for (const t of [
      "events",
      "subjects",
      "assessments",
      "reminders",
      "settings",
      "sessions",
      "study_tracks",
      "calendar_tokens",
      "push_subscriptions",
      "notifications",
      "holidays",
    ]) {
      await pool.query(`delete from ${t} where user_id = $1`, [userId]);
    }
    const token = randomBytes(32).toString("hex");
    await pool.query(
      `insert into sessions (session_token, user_id, expires) values ($1, $2, now() + interval '1 day')`,
      [token, userId],
    );
    return { userId, token };
  } finally {
    await pool.end();
  }
}
