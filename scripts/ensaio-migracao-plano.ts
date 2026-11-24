// Ensaio da migração de dados do plano, só no banco local:
//   DATABASE_URL=postgres://pentagon:pentagon@localhost:5433/<banco novo> npm run db:migrate
//   DATABASE_URL=... npx tsx --conditions=react-server scripts/ensaio-migracao-plano.ts
// Monta um dono no formato real de antes do plano (seeds de DevOps, Segurança, roadmap e rotina,
// cards CKA e SEG, erros e avisos), roda `migrar()` como o deploy e mostra as contagens por tabela.
import "./env";
import { sql } from "drizzle-orm";
import { db } from "../src/server/db";
import { criarDono } from "../tests/integracao/dono-antigo";
import { migrar } from "./migrar";

const EMAIL = "ensaio-dono@pentagon.local";

const TABELAS = [
  "study_tracks",
  "study_weeks",
  "study_sessions",
  "study_reviews",
  "study_errors",
  "events",
  "event_exceptions",
  "flashcards",
  "flashcard_answers",
  "roadmap_requirement_progress",
  "roadmap_practice_progress",
  "notifications",
  "subjects",
  "arquivamentos",
] as const;

async function contar(userId: string) {
  const saida: Record<string, number> = {};
  for (const t of TABELAS) {
    const sqlDaTabela =
      t === "study_weeks"
        ? sql`select count(*)::int as n from study_weeks w join study_tracks t on t.id = w.track_id where t.user_id = ${userId}`
        : sql`select count(*)::int as n from ${sql.identifier(t)} where user_id = ${userId}`;
    saida[t] = ((await db().execute(sqlDaTabela)).rows[0] as { n: number }).n;
  }
  return saida;
}

async function avisos(userId: string) {
  const r = await db().execute(
    sql`select status, alvo_tipo, count(*)::int as n from notifications where user_id = ${userId} group by 1, 2 order by 1, 2`,
  );
  return JSON.stringify(r.rows);
}

async function academia(userId: string) {
  const r = await db().execute(
    sql`select duracao_min, to_char(inicio at time zone fuso, 'HH24:MI') as hora from events where user_id = ${userId} and titulo = 'Academia'`,
  );
  return r.rows[0] as { duracao_min: number; hora: string };
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/localhost|127\.0\.0\.1/.test(url))
    throw new Error("Recusado: o ensaio só roda em banco local.");
  process.env.OWNER_EMAILS = EMAIL;

  const userId = await criarDono(EMAIL, new Date());
  const antes = await contar(userId);
  const academiaAntes = await academia(userId);
  const avisosAntes = await avisos(userId);

  await migrar();
  const depois = await contar(userId);
  const academiaDepois = await academia(userId);
  await migrar();
  const deNovo = await contar(userId);

  console.log("\nContagens por tabela (dono do ensaio)");
  console.log("tabela".padEnd(32), "antes".padStart(6), "depois".padStart(7), "2ª vez".padStart(7));
  for (const t of TABELAS) {
    console.log(
      t.padEnd(32),
      String(antes[t]).padStart(6),
      String(depois[t]).padStart(7),
      String(deNovo[t]).padStart(7),
    );
  }
  console.log("\nAcademia antes:", academiaAntes, "depois:", academiaDepois);

  const a = await db().execute(
    sql`select tipo, chave from arquivamentos where user_id = ${userId} order by tipo, chave`,
  );
  console.log("\nLinhas de arquivamentos");
  for (const l of a.rows as { tipo: string; chave: string }[]) console.log(`${l.tipo}\t${l.chave}`);

  const s = await db().execute(
    sql`select plano_migrado_em is not null as migrado, blocos_plano, pergunta_folga, aviso_blocos_min from settings where user_id = ${userId}`,
  );
  console.log("\nsettings:", JSON.stringify(s.rows[0]));
  console.log("\navisos antes:", avisosAntes);
  console.log("avisos depois:", await avisos(userId));
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => setTimeout(() => process.exit(), 100));
