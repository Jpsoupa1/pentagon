import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { addDias, diaDaSemana, FUSO_PADRAO, hojeLocal, paraUtc } from "../../lib/tempo";
import { events, settings, studyTracks, type FaseTrilha } from "../db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QualquerDb = NodePgDatabase<any>;

// Trilha de Segurança e SecOps: leve, sem datas nem metas. Uma fase por vez, avançando só quando
// a anterior estiver consolidada (o usuário decide em Estudos). Conteúdo em docs/seguranca/.

export const SLUG_SEGURANCA = "seguranca";
export const NOME_SEGURANCA = "Segurança e SecOps";

export const FASES_SEGURANCA: FaseTrilha[] = [
  {
    id: 1,
    nome: "Fundamentos",
    curto: "Fundamentos",
    prova: "",
    temas: [
      "Redes: TCP/IP, DNS, HTTP/HTTPS e TLS",
      "Linux: terminal, permissões, processos e logs",
      "Conceitos: tríade CIA, autenticação vs autorização, criptografia e hashing",
    ],
    praticas: ["TryHackMe: Pre Security (redes e Linux)", "Hack The Box: Starting Point, Tier 0"],
    consolidada: "explicar um handshake TLS e uma resolução DNS e ler logs do Linux sem consultar.",
  },
  {
    id: 2,
    nome: "Segurança de aplicações web",
    curto: "Web",
    prova: "",
    temas: [
      "OWASP Top 10",
      "Burp Suite: Proxy, Repeater e Intruder",
      "Injeção, XSS, controle de acesso e autenticação",
    ],
    praticas: [
      "PortSwigger Web Security Academy: labs Apprentice",
      "TryHackMe: OWASP Top 10 e Burp Suite",
    ],
    consolidada:
      "resolver os labs Apprentice dos temas principais com o Burp, sem seguir o passo a passo.",
  },
  {
    id: 3,
    nome: "SecOps",
    curto: "SecOps",
    prova: "",
    temas: [
      "Monitoramento e detecção: SIEM e leitura de logs",
      "Resposta a incidentes: preparação, contenção, erradicação e lições",
      "MITRE ATT&CK: táticas, técnicas e mapeamento de alertas",
    ],
    praticas: ["TryHackMe: SOC Level 1", "Hack The Box: Sherlocks (blue team)"],
    consolidada: "investigar um alerta nos logs e mapear o que aconteceu para técnicas do ATT&CK.",
  },
  {
    id: 4,
    nome: "DevSecOps",
    curto: "DevSecOps",
    prova: "",
    temas: [
      "Segurança no pipeline: SAST, DAST e varredura de dependências",
      "Gestão de segredos",
      "Segurança de containers (Docker)",
    ],
    praticas: [
      "Pipeline de um projeto seu com Semgrep, OWASP ZAP e Trivy",
      "TryHackMe: trilha DevSecOps",
    ],
    consolidada:
      "ter um pipeline que barra uma dependência vulnerável e um segredo no código, com a imagem limpa no Trivy.",
  },
];

/** Prática em laboratório legal vale para todas as fases. */
export const LABS_SEGURANCA = ["PortSwigger", "TryHackMe", "Hack The Box"];

/**
 * Sessões semanais só em dias úteis, nos horários livres: terça e quinta no fim da tarde (entre
 * a academia e a aula das 19:10) e a tarde de sexta (entre o estágio e a academia). Cerca de 3 h.
 */
export const SESSOES_SEGURANCA = [
  { dia: 2, hora: "17:45", minutos: 45 },
  { dia: 4, hora: "17:45", minutos: 45 },
  { dia: 5, hora: "14:00", minutos: 90 },
] as const;

const NOTAS =
  "Sessão leve, sem meta: siga a fase atual em Estudos e pratique em laboratório legal " +
  `(${LABS_SEGURANCA.join(", ")}).`;

/**
 * Registra a trilha de Segurança e cria as sessões semanais como compromissos recorrentes.
 * Idempotente: se a trilha já existe, só atualiza nome e fases e mantém a fase atual e os
 * compromissos (o usuário pode ter mudado o horário ou apagado algum).
 */
export async function semearSeguranca(db: QualquerDb, userId: string, agora = new Date()) {
  const [existente] = await db
    .select({ id: studyTracks.id })
    .from(studyTracks)
    .where(and(eq(studyTracks.userId, userId), eq(studyTracks.slug, SLUG_SEGURANCA)));
  if (existente) {
    await db
      .update(studyTracks)
      .set({ nome: NOME_SEGURANCA, fases: FASES_SEGURANCA })
      .where(eq(studyTracks.id, existente.id));
    return { criada: false };
  }

  const [ajuste] = await db
    .select({ fuso: settings.fuso })
    .from(settings)
    .where(eq(settings.userId, userId));
  const fuso = ajuste?.fuso ?? FUSO_PADRAO;
  const hoje = hojeLocal(agora, fuso);

  await db.transaction(async (tx) => {
    const [trilha] = await tx
      .insert(studyTracks)
      .values({
        userId,
        slug: SLUG_SEGURANCA,
        nome: NOME_SEGURANCA,
        inicio: hoje,
        fim: null,
        fases: FASES_SEGURANCA,
        marcos: [],
        faseAtual: FASES_SEGURANCA[0].id,
      })
      .returning({ id: studyTracks.id });
    await tx.insert(events).values(
      SESSOES_SEGURANCA.map((s) => {
        // Primeira ocorrência: o próximo dia da semana da sessão, a partir de hoje.
        const data = addDias(hoje, (s.dia - diaDaSemana(hoje) + 7) % 7);
        return {
          userId,
          trackId: trilha.id,
          titulo: NOME_SEGURANCA,
          areaId: "estudos" as const,
          notas: NOTAS,
          inicio: paraUtc(data, s.hora, fuso),
          duracaoMin: s.minutos,
          fuso,
          diasSemana: [s.dia],
          repeteDesde: data,
          lembrarMin: 10,
        };
      }),
    );
  });
  return { criada: true };
}
