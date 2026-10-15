import type { Ocorrencia } from "../agenda/recorrencia";

// Regras puras de agendamento de avisos: o que deveria estar agendado e o que muda.

export type AlvoAviso = "evento" | "avaliacao" | "sessao" | "lembrete";

export type AvisoDesejado = {
  alvoTipo: AlvoAviso;
  alvoId: string;
  ocorrencia: string | null;
  enviarEm: Date;
  titulo: string;
  corpo: string;
  url: string;
};

export type AvisoExistente = {
  id: string;
  alvoTipo: AlvoAviso;
  alvoId: string;
  enviarEm: Date;
  qstashMessageId: string | null;
};

/** Janela que fica agendada no QStash; o cron diário completa o resto. */
export const JANELA_MS = 48 * 60 * 60_000;

export function chaveAviso(a: { alvoTipo: string; alvoId: string; enviarEm: Date }) {
  return `${a.alvoTipo}:${a.alvoId}:${a.enviarEm.getTime()}`;
}

function minutosTexto(min: number) {
  if (min === 0) return "agora";
  if (min < 60) return `em ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `em ${h} h${m ? ` ${m} min` : ""}`;
}

/** Aviso N minutos antes de cada sessão de estudo ainda não feita que começa dentro da janela. */
export function avisosDeSessoes(
  sessoes: Ocorrencia[],
  minutosAntes: number,
  agora: Date,
  horaLocal: (d: Date) => string,
): AvisoDesejado[] {
  const fim = agora.getTime() + JANELA_MS;
  return sessoes
    .filter((o) => o.origem === "sessao" && !o.feita)
    .map((o) => ({ o, enviarEm: new Date(o.inicio.getTime() - minutosAntes * 60_000) }))
    .filter(({ enviarEm }) => enviarEm.getTime() > agora.getTime() && enviarEm.getTime() <= fim)
    .map(({ o, enviarEm }) => ({
      alvoTipo: "sessao" as const,
      alvoId: o.eventId,
      ocorrencia: o.dataOriginal,
      enviarEm,
      titulo: `Estudo ${minutosTexto(minutosAntes)} · ${horaLocal(o.inicio)}`,
      corpo: o.titulo,
      url: "/estudos",
    }));
}

/**
 * Compara o que está agendado com o que deveria estar (só dentro da janela futura):
 * cria os que faltam e cancela os que não valem mais (horário mudou, sessão feita...).
 */
export function diferencaAvisos(existentes: AvisoExistente[], desejados: AvisoDesejado[]) {
  const desejadosPorChave = new Map(desejados.map((d) => [chaveAviso(d), d]));
  const existentesPorChave = new Map(existentes.map((e) => [chaveAviso(e), e]));
  return {
    criar: desejados.filter((d) => !existentesPorChave.has(chaveAviso(d))),
    cancelar: existentes.filter((e) => !desejadosPorChave.has(chaveAviso(e))),
  };
}

function naJanela(enviarEm: Date, agora: Date) {
  return enviarEm.getTime() > agora.getTime() && enviarEm.getTime() <= agora.getTime() + JANELA_MS;
}

/** Compromissos com "lembrar antes": um aviso por ocorrência. */
export function avisosDeCompromissos(
  ocorrencias: Ocorrencia[],
  lembrarPorEvento: Map<string, number | null>,
  agora: Date,
  horaLocal: (d: Date) => string,
): AvisoDesejado[] {
  const saida: AvisoDesejado[] = [];
  for (const o of ocorrencias) {
    if (o.origem !== "evento" || o.diaInteiro) continue;
    const min = lembrarPorEvento.get(o.eventId);
    if (min === null || min === undefined) continue;
    const enviarEm = new Date(o.inicio.getTime() - min * 60_000);
    if (!naJanela(enviarEm, agora)) continue;
    saida.push({
      alvoTipo: "evento",
      alvoId: o.eventId,
      ocorrencia: o.dataOriginal,
      enviarEm,
      titulo: `${o.titulo} ${minutosTexto(min)} · ${horaLocal(o.inicio)}`,
      corpo: o.local ? `Local: ${o.local}` : "Toque para abrir a agenda.",
      url: "/agenda",
    });
  }
  return saida;
}

export type AvaliacaoParaAviso = {
  id: string;
  titulo: string;
  tipo: string;
  sigla: string | null;
  entregaEm: Date;
  lembrarMin: number | null;
};

/** Provas e entregas: na véspera (24 h antes) e horas antes (o "lembrar antes" da avaliação). */
export function avisosDeAvaliacoes(
  avaliacoes: AvaliacaoParaAviso[],
  agora: Date,
  horaLocal: (d: Date) => string,
): AvisoDesejado[] {
  const saida: AvisoDesejado[] = [];
  for (const a of avaliacoes) {
    const nome = `${a.tipo}${a.sigla ? ` de ${a.sigla}` : ""}`;
    const vespera = new Date(a.entregaEm.getTime() - 24 * 60 * 60_000);
    const momentos = [{ quando: vespera, titulo: `Amanhã: ${nome} às ${horaLocal(a.entregaEm)}` }];
    if (a.lembrarMin && a.lembrarMin !== 24 * 60) {
      momentos.push({
        quando: new Date(a.entregaEm.getTime() - a.lembrarMin * 60_000),
        titulo: `${nome} ${minutosTexto(a.lembrarMin)} · ${horaLocal(a.entregaEm)}`,
      });
    }
    for (const m of momentos) {
      if (!naJanela(m.quando, agora)) continue;
      saida.push({
        alvoTipo: "avaliacao",
        alvoId: a.id,
        ocorrencia: null,
        enviarEm: m.quando,
        titulo: m.titulo,
        corpo: a.titulo,
        url: `/provas?item=${a.id}`,
      });
    }
  }
  return saida;
}

/** Lembretes: aviso na hora marcada. */
export function avisosDeLembretes(
  lembretes: { id: string; texto: string; quando: Date }[],
  agora: Date,
): AvisoDesejado[] {
  return lembretes
    .filter((l) => naJanela(l.quando, agora))
    .map((l) => ({
      alvoTipo: "lembrete" as const,
      alvoId: l.id,
      ocorrencia: null,
      enviarEm: l.quando,
      titulo: "Lembrete",
      corpo: l.texto,
      url: "/lembretes",
    }));
}
