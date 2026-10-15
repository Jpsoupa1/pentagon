import "server-only";
import { and, count, eq, gte, isNull, sql } from "drizzle-orm";
import { hojeLocal, paraUtc } from "@/lib/tempo";
import { minutosPorArea } from "../agenda/recorrencia";
import { db } from "../db";
import { assessments, reminders, studySessions, subjects } from "../db/schema";
import { obterAjustes } from "./ajustes";
import { ocorrencias, semanaDe } from "./agenda";

/** Contadores do menu e horas da semana por área (barra lateral). */
export async function resumoNavegacao(userId: string) {
  const { fuso } = await obterAjustes(userId);
  const hoje = hojeLocal(new Date(), fuso);
  const semana = semanaDe(hoje);
  const d = db();
  const [[aulas], [provas], [estudos], [lembretes], daSemana] = await Promise.all([
    d.select({ n: count() }).from(subjects).where(eq(subjects.userId, userId)),
    d
      .select({ n: count() })
      .from(assessments)
      .where(
        and(
          eq(assessments.userId, userId),
          isNull(assessments.concluidaEm),
          gte(assessments.entregaEm, paraUtc(hoje, "00:00", fuso)),
        ),
      ),
    d
      .select({ n: count() })
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, userId),
          eq(studySessions.status, "pendente"),
          sql`${studySessions.data} between ${semana.de} and ${semana.ate}`,
        ),
      ),
    d
      .select({ n: count() })
      .from(reminders)
      .where(and(eq(reminders.userId, userId), eq(reminders.concluido, false))),
    ocorrencias(userId, semana),
  ]);
  return {
    contadores: { aulas: aulas.n, provas: provas.n, estudos: estudos.n, lembretes: lembretes.n },
    minutosPorArea: minutosPorArea(daSemana),
  };
}
