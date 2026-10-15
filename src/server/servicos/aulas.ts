import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { addDias, hojeLocal, partesLocais } from "@/lib/tempo";
import { db } from "../db";
import { events } from "../db/schema";
import { ocorrencias } from "./agenda";

export type HorarioAula = {
  subjectId: string;
  diaSemana: number;
  inicio: string;
  fim: string;
  local: string | null;
};

/** Horários semanais de cada disciplina, a partir dos compromissos ligados a ela. */
export async function gradeDasDisciplinas(userId: string): Promise<HorarioAula[]> {
  const lista = await db()
    .select()
    .from(events)
    .where(and(eq(events.userId, userId), isNotNull(events.subjectId)));
  const grade: HorarioAula[] = [];
  for (const e of lista) {
    const ini = partesLocais(e.inicio, e.fuso);
    const fim = partesLocais(new Date(e.inicio.getTime() + e.duracaoMin * 60_000), e.fuso);
    for (const d of e.diasSemana ?? [ini.diaSemana]) {
      grade.push({
        subjectId: e.subjectId!,
        diaSemana: d,
        inicio: ini.hora,
        fim: fim.hora,
        local: e.local,
      });
    }
  }
  return grade.sort(
    (a, b) => ((a.diaSemana + 6) % 7) - ((b.diaSemana + 6) % 7) || a.inicio.localeCompare(b.inicio),
  );
}

export async function proximasAulas(userId: string, subjectId: string, fuso: string, dias = 21) {
  const hoje = hojeLocal(new Date(), fuso);
  const lista = await ocorrencias(userId, { de: hoje, ate: addDias(hoje, dias) });
  const agora = Date.now();
  return lista.filter((o) => o.subjectId === subjectId && o.fim.getTime() > agora).slice(0, 5);
}
