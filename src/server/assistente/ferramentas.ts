import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { areaIds, assessmentKinds, repeticoes, type AreaId } from "@/lib/dominio";
import { turnos } from "@/lib/estudos";
import {
  addDias,
  dataCurta,
  difDias,
  hmParaMin,
  horaLocal,
  minParaHm,
  partesLocais,
} from "@/lib/tempo";
import {
  avaliacaoSchema,
  dataSchema,
  eventoSchema,
  excecaoSchema,
  faltaSchema,
  horaSchema,
  lembreteSchema,
} from "@/lib/validacao";
import type { Ocorrencia } from "../agenda/recorrencia";
import { db } from "../db";
import { absences, type ConflitoDaAcao } from "../db/schema";
import { Conflito, NaoEncontrado } from "../erros";
import { agenda, ocorrencias } from "../servicos/agenda";
import { apagarAvaliacao, criarAvaliacao } from "../servicos/avaliacoes";
import {
  atualizarComChecagem,
  criarComChecagem,
  excecaoComChecagem,
  moverSessaoComChecagem,
  type DetalheConflito,
} from "../servicos/compromissos";
import { obterDisciplina, registrarFalta } from "../servicos/disciplinas";
import { tituloDaSessao } from "../estudos/trilha";
import { marcarSessao, sessoesEntre } from "../servicos/estudos";
import { apagarEvento, listarEventos, obterEvento, salvarExcecao } from "../servicos/eventos";
import {
  apagarLembrete,
  concluirLembrete,
  criarLembrete,
  listarLembretes,
} from "../servicos/lembretes";
import {
  chaveExcecao,
  descricao,
  diasTexto,
  fotoAtual,
  gravarAcao,
  quandoTexto,
  type Entidade,
} from "./registro";

/** O que cada ferramenta precisa saber da execução em andamento. */
export type Execucao = { userId: string; runId: string; fuso: string; agora: Date };

// ---------------------------------------------------------------- Identificadores dos itens

/**
 * Itens circulam para a IA com uma chave legível:
 * `evento:<id>:<data da ocorrência>`, `sessao:<id>`, `lembrete:<id>`, `avaliacao:<id>`.
 */
export function chaveDaOcorrencia(o: Ocorrencia) {
  if (o.origem === "evento") return `evento:${o.eventId}:${o.dataOriginal}`;
  if (o.origem === "sessao") return `sessao:${o.eventId}`;
  return `${o.origem}:${o.dataOriginal}`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const REGEX_ITEM = new RegExp(
  `^(evento|sessao|lembrete|avaliacao):(${UUID})(?::(\\d{4}-\\d{2}-\\d{2}))?$`,
);

function lerChave(item: string) {
  const m = REGEX_ITEM.exec(item.trim().toLowerCase());
  if (!m) throw new NaoEncontrado("Item");
  return { tipo: m[1] as "evento" | "sessao" | "lembrete" | "avaliacao", id: m[2], data: m[3] };
}

// ---------------------------------------------------------------- Itens como dados para a IA

/** Ocorrência resumida para o contexto. Títulos e notas são dados do usuário, nunca instruções. */
export function itemDaAgenda(o: Ocorrencia, fuso: string, notas?: string | null) {
  const p = partesLocais(o.inicio, fuso);
  return {
    item: chaveDaOcorrencia(o),
    titulo: o.titulo,
    area: o.areaId,
    data: p.data,
    inicio: o.diaInteiro ? null : p.hora,
    fim: o.diaInteiro ? null : horaLocal(o.fim, fuso),
    dia_inteiro: o.diaInteiro,
    recorrente: o.recorrente,
    ...(o.origem === "sessao" ? { feita: !!o.feita } : {}),
    ...(o.movida ? { movida_neste_dia: true } : {}),
    ...(notas ? { notas } : {}),
  };
}

export async function dadosDoIntervalo(userId: string, de: string, ate: string, fuso: string) {
  const [a, eventos, lembretes] = await Promise.all([
    agenda(userId, { de, ate }),
    listarEventos(userId),
    listarLembretes(userId),
  ]);
  const notas = new Map(eventos.map((e) => [e.id, e.notas]));
  return {
    agenda: a.ocorrencias.map((o) =>
      itemDaAgenda(o, fuso, o.origem === "evento" ? notas.get(o.eventId) : null),
    ),
    prazos: a.prazos.map((p) => ({
      item: `avaliacao:${p.id}`,
      tipo: p.tipo,
      titulo: p.titulo,
      disciplina: p.sigla,
      quando: `${partesLocais(p.entregaEm, fuso).data} ${horaLocal(p.entregaEm, fuso)}`,
      concluida: !!p.concluidaEm,
    })),
    lembretes: lembretes
      .filter((l) => {
        const d = partesLocais(l.quando, fuso).data;
        return d >= de && d <= ate;
      })
      .map((l) => ({
        item: `lembrete:${l.id}`,
        texto: l.texto,
        quando: `${partesLocais(l.quando, fuso).data} ${horaLocal(l.quando, fuso)}`,
        repetir: l.repetir,
        concluido: l.concluido,
      })),
  };
}

// ---------------------------------------------------------------- Esquemas das ferramentas

const area = z.enum(areaIds);
const textoCurto = (max: number) => z.string().trim().min(1).max(max);

export const esquemas = {
  listar_agenda: z.object({
    de: dataSchema.describe("Primeiro dia (AAAA-MM-DD)"),
    ate: dataSchema.describe("Último dia (AAAA-MM-DD), no máximo 31 dias depois de `de`"),
  }),
  criar_compromisso: z.object({
    titulo: textoCurto(120),
    area,
    data: dataSchema.describe("Dia do compromisso (ou da primeira vez, se repetir)"),
    hora: horaSchema.describe("Hora de início, HH:MM"),
    duracao_min: z.number().int().min(5).max(1440).describe("Duração em minutos"),
    dias_semana: z
      .array(z.number().int().min(0).max(6))
      .optional()
      .describe("Para repetir toda semana: 0 = domingo ... 6 = sábado"),
    repete_ate: dataSchema.optional().describe("Último dia da repetição"),
    local: textoCurto(120).optional(),
    notas: textoCurto(500).optional(),
  }),
  alterar_compromisso: z.object({
    item: z.string().describe("Chave `evento:<id>:<data>` de uma ocorrência listada"),
    escopo: z
      .enum(["ocorrencia", "todas"])
      .describe("`ocorrencia` muda só aquele dia; `todas` muda o compromisso em todas as vezes"),
    nova_data: dataSchema.optional(),
    nova_hora: horaSchema.optional(),
    nova_duracao_min: z.number().int().min(5).max(1440).optional(),
    novo_titulo: textoCurto(120).optional().describe("Só com escopo `todas`"),
    novo_local: textoCurto(120).optional().describe("Só com escopo `todas`"),
  }),
  criar_lembrete: z.object({
    texto: textoCurto(200),
    data: dataSchema,
    hora: horaSchema,
    repetir: z.enum(repeticoes).optional(),
    area: area.optional(),
  }),
  concluir_lembrete: z.object({ item: z.string().describe("Chave `lembrete:<id>`") }),
  concluir_sessao_estudo: z.object({
    data: dataSchema.describe("Dia da sessão da trilha de estudos"),
    turno: z
      .enum(turnos)
      .optional()
      .describe(
        "Segunda a quinta têm duas sessões: manha (conteúdo) e tarde (prática). Sem turno, vale a única pendente do dia.",
      ),
  }),
  criar_avaliacao: z.object({
    tipo: z.enum(assessmentKinds),
    titulo: textoCurto(120),
    disciplina_id: z.uuid().optional().describe("Id da disciplina (veja `disciplinas`)"),
    data: dataSchema,
    hora: horaSchema.optional().describe("Padrão 23:59 para entregas"),
  }),
  marcar_falta: z.object({
    disciplina_id: z.uuid(),
    data: dataSchema,
    quantidade: z.number().int().min(1).max(10).optional(),
  }),
  propor_exclusao: z.object({
    item: z
      .string()
      .describe("Chave do item: `evento:<id>:<data>`, `lembrete:<id>` ou `avaliacao:<id>`"),
    escopo: z
      .enum(["ocorrencia", "todas"])
      .optional()
      .describe("Para compromissos: só aquele dia ou o compromisso inteiro"),
  }),
  responder: z.object({
    tipo: z.enum(["acoes", "consulta", "fora_do_escopo"]),
    resumo: z.string().max(300).describe("Uma frase curta para o registro"),
    ignorou_parte: z
      .boolean()
      .optional()
      .describe("true se o pedido tinha uma parte fora do escopo que você ignorou"),
    janela: z
      .object({
        de: dataSchema,
        ate: dataSchema,
        hora_inicio: horaSchema.optional(),
        hora_fim: horaSchema.optional(),
        areas: z.array(area).optional(),
      })
      .optional()
      .describe("Obrigatória quando tipo = consulta: o período que responde à pergunta"),
  }),
} as const;

export type NomeFerramenta = keyof typeof esquemas;

export const DESCRICOES: Record<NomeFerramenta, string> = {
  listar_agenda:
    "Lista compromissos, sessões de estudo, prazos e lembretes de um período. Use para achar itens além de hoje e amanhã ou para responder perguntas sobre a agenda.",
  criar_compromisso: "Cria um compromisso na agenda (único ou semanal).",
  alterar_compromisso:
    "Muda horário, data ou duração de um compromisso. Com escopo `ocorrencia`, só naquele dia; com `todas`, em todas as vezes. Conflitos de horário não impedem a mudança: o app avisa o usuário, e você não mexe no outro item.",
  criar_lembrete: "Cria um lembrete com aviso no horário.",
  concluir_lembrete: "Marca um lembrete como concluído.",
  concluir_sessao_estudo:
    "Marca como feita uma sessão da trilha de estudos (de segunda a quinta há a da manhã e a da tarde).",
  criar_avaliacao: "Cadastra prova, entrega, trabalho ou apresentação.",
  marcar_falta: "Registra falta numa disciplina num dia.",
  propor_exclusao:
    "Propõe apagar um compromisso (um dia ou todos), lembrete ou avaliação. Nada é apagado: o usuário confirma na tela.",
  responder:
    "Termina o pedido. Chame sempre, uma única vez, depois das outras ferramentas. tipo: `acoes` (algo foi feito ou proposto), `consulta` (pergunta sobre a agenda; informe a janela) ou `fora_do_escopo`.",
};

// ---------------------------------------------------------------- Conflitos

type HorarioAntigo = { inicio: Date; fim: Date; novoInicio: Date; novoFim: Date } | null;

/**
 * Conflitos que o app encontrou. A sugestão é sempre levar o outro item para o horário que esta
 * mudança liberou, no mesmo dia, se ele couber ali; quem decide é o usuário.
 */
function conflitosDaMudanca(erro: Conflito, fuso: string, antigo: HorarioAntigo): ConflitoDaAcao[] {
  const detalhes =
    (erro.detalhes as { conflitos?: DetalheConflito[] } | undefined)?.conflitos ?? [];
  return detalhes.map((d) => {
    const inicio = new Date(d.outro.inicio);
    const fim = new Date(d.outro.fim);
    const dia = partesLocais(inicio, fuso).data;
    let sugestao: string | null = null;
    if (
      antigo &&
      (d.outro.origem === "evento" || d.outro.origem === "sessao") &&
      partesLocais(antigo.inicio, fuso).data === dia
    ) {
      const novoFimOutro = new Date(antigo.inicio.getTime() + (fim.getTime() - inicio.getTime()));
      const chocaComAMudanca = antigo.inicio < antigo.novoFim && antigo.novoInicio < novoFimOutro;
      if (!chocaComAMudanca) sugestao = horaLocal(antigo.inicio, fuso);
    }
    return {
      titulo: d.com,
      horario: d.comHorario,
      origem: d.outro.origem,
      id: d.outro.id,
      data: d.outro.data,
      dia,
      sugestao,
    };
  });
}

/** Tenta com a checagem; se só houver conflito, aplica mesmo assim e devolve os conflitos. */
async function comConflitos<T>(
  fazer: (ignorar: boolean) => Promise<T>,
  fuso: string,
  antigo: HorarioAntigo,
): Promise<{ resultado: T; conflitos: ConflitoDaAcao[] }> {
  try {
    return { resultado: await fazer(false), conflitos: [] };
  } catch (e) {
    if (!(e instanceof Conflito) || !e.detalhes) throw e;
    return { resultado: await fazer(true), conflitos: conflitosDaMudanca(e, fuso, antigo) };
  }
}

async function ocorrenciaAtual(userId: string, eventId: string, data: string) {
  const lista = await ocorrencias(userId, { de: addDias(data, -31), ate: addDias(data, 31) });
  const o = lista.find((x) => x.origem === "evento" && x.chave === `${eventId}:${data}`);
  if (!o) throw new NaoEncontrado("Ocorrência");
  return o;
}

const avisoConflito = (c: ConflitoDaAcao[]) =>
  c.length
    ? ` Choca com: ${c.map((x) => `${x.titulo} (${x.horario})`).join("; ")}. O usuário vai decidir; não mexa nesses itens.`
    : "";

// ---------------------------------------------------------------- Execução

type Saida = { texto: string };

export async function executarFerramenta(
  ex: Execucao,
  nome: Exclude<NomeFerramenta, "responder">,
  entrada: unknown,
): Promise<Saida> {
  const { userId, runId, fuso } = ex;
  switch (nome) {
    case "listar_agenda": {
      const { de, ate } = esquemas.listar_agenda.parse(entrada);
      if (ate < de || difDias(de, ate) > 31) throw new Conflito("Período inválido (até 31 dias).");
      return { texto: JSON.stringify(await dadosDoIntervalo(userId, de, ate, fuso)) };
    }

    case "criar_compromisso": {
      const c = esquemas.criar_compromisso.parse(entrada);
      const e = eventoSchema.parse({
        titulo: c.titulo,
        areaId: c.area,
        data: c.data,
        hora: c.hora,
        duracaoMin: c.duracao_min,
        diasSemana: c.dias_semana,
        repeteAte: c.repete_ate,
        local: c.local,
        notas: c.notas,
      });
      const { resultado, conflitos } = await comConflitos(
        (ignorar) => criarComChecagem(userId, { ...e, ignorarConflito: ignorar }),
        fuso,
        null,
      );
      const fim = new Date(resultado.inicio.getTime() + resultado.duracaoMin * 60_000);
      const dias = diasTexto(resultado.diasSemana);
      await gravarAcao({
        runId,
        userId,
        tipo: "criado",
        entidade: "evento",
        entidadeId: resultado.id,
        antes: null,
        depois: await fotoAtual(userId, "evento", resultado.id),
        descricao: descricao(resultado.areaId, resultado.titulo, [
          {
            rotulo: dias ? "Repete" : "Quando",
            antes: null,
            depois: dias
              ? `${dias} · ${horaLocal(resultado.inicio, fuso)}–${horaLocal(fim, fuso)}`
              : quandoTexto(resultado.inicio, fim, fuso),
          },
        ]),
        conflitos,
      });
      return { texto: `Compromisso criado.${avisoConflito(conflitos)}` };
    }

    case "alterar_compromisso": {
      const a = esquemas.alterar_compromisso.parse(entrada);
      const chave = lerChave(a.item);
      if (chave.tipo !== "evento" || !chave.data) throw new NaoEncontrado("Compromisso");
      const evento = await obterEvento(userId, chave.id);

      if (a.escopo === "ocorrencia") {
        if (a.novo_titulo || a.novo_local)
          throw new Conflito("Título e local só mudam com escopo `todas`.");
        const atual = await ocorrenciaAtual(userId, chave.id, chave.data);
        const p = partesLocais(atual.inicio, fuso);
        const minutos =
          a.nova_duracao_min ?? Math.round((atual.fim.getTime() - atual.inicio.getTime()) / 60_000);
        const x = excecaoSchema.parse({
          data: chave.data,
          tipo: "movida",
          novaData: a.nova_data ?? p.data,
          novaHora: a.nova_hora ?? p.hora,
          novaDuracaoMin: minutos,
        });
        const novoInicio = new Date(
          atual.inicio.getTime() +
            (hmParaMin(x.novaHora!) - p.minutos) * 60_000 +
            difDias(p.data, x.novaData!) * 86_400_000,
        );
        const novoFim = new Date(novoInicio.getTime() + minutos * 60_000);
        const id = chaveExcecao(chave.id, chave.data);
        const antes = await fotoAtual(userId, "excecao", id);
        const { conflitos } = await comConflitos(
          (ignorar) => excecaoComChecagem(userId, chave.id, { ...x, ignorarConflito: ignorar }),
          fuso,
          { inicio: atual.inicio, fim: atual.fim, novoInicio, novoFim },
        );
        await gravarAcao({
          runId,
          userId,
          tipo: "alterado",
          entidade: "excecao",
          entidadeId: id,
          antes,
          depois: await fotoAtual(userId, "excecao", id),
          descricao: descricao(evento.areaId, evento.titulo, [
            {
              rotulo: "Horário",
              antes: quandoTexto(atual.inicio, atual.fim, fuso),
              depois: quandoTexto(novoInicio, novoFim, fuso),
            },
          ]),
          conflitos,
        });
        return { texto: `Mudado só neste dia.${avisoConflito(conflitos)}` };
      }

      const p = partesLocais(evento.inicio, evento.fuso);
      const e = eventoSchema.parse({
        titulo: a.novo_titulo ?? evento.titulo,
        areaId: evento.areaId,
        subjectId: evento.subjectId,
        local: a.novo_local ?? evento.local,
        notas: evento.notas,
        data: a.nova_data ?? p.data,
        hora: a.nova_hora ?? p.hora,
        duracaoMin: a.nova_duracao_min ?? evento.duracaoMin,
        diaInteiro: evento.diaInteiro,
        diasSemana: evento.diasSemana,
        repeteAte: evento.repeteAte,
        lembrarMin: evento.lembrarMin,
      });
      const antes = await fotoAtual(userId, "evento", evento.id);
      const { resultado, conflitos } = await comConflitos(
        (ignorar) => atualizarComChecagem(userId, evento.id, { ...e, ignorarConflito: ignorar }),
        fuso,
        null,
      );
      const faixa = (inicio: Date, min: number) =>
        `${horaLocal(inicio, fuso)}–${horaLocal(new Date(inicio.getTime() + min * 60_000), fuso)}`;
      const campos = [
        { rotulo: "Título", antes: evento.titulo, depois: resultado.titulo },
        {
          rotulo: "Horário",
          antes: faixa(evento.inicio, evento.duracaoMin),
          depois: faixa(resultado.inicio, resultado.duracaoMin),
        },
        {
          rotulo: evento.diasSemana ? "A partir de" : "Dia",
          antes: dataCurta(p.data),
          depois: dataCurta(partesLocais(resultado.inicio, fuso).data),
        },
        { rotulo: "Local", antes: evento.local, depois: resultado.local },
      ].filter((c) => c.antes !== c.depois);
      await gravarAcao({
        runId,
        userId,
        tipo: "alterado",
        entidade: "evento",
        entidadeId: evento.id,
        antes,
        depois: await fotoAtual(userId, "evento", evento.id),
        descricao: descricao(resultado.areaId, resultado.titulo, campos),
        conflitos,
      });
      return { texto: `Compromisso alterado em todas as vezes.${avisoConflito(conflitos)}` };
    }

    case "criar_lembrete": {
      const l = esquemas.criar_lembrete.parse(entrada);
      const criado = await criarLembrete(
        userId,
        lembreteSchema.parse({
          texto: l.texto,
          data: l.data,
          hora: l.hora,
          repetir: l.repetir,
          areaId: l.area,
        }),
      );
      await gravarAcao({
        runId,
        userId,
        tipo: "criado",
        entidade: "lembrete",
        entidadeId: criado.id,
        antes: null,
        depois: await fotoAtual(userId, "lembrete", criado.id),
        descricao: descricao(criado.areaId, criado.texto, [
          { rotulo: "Quando", antes: null, depois: quandoTexto(criado.quando, null, fuso) },
        ]),
      });
      return { texto: "Lembrete criado." };
    }

    case "concluir_lembrete": {
      const { item } = esquemas.concluir_lembrete.parse(entrada);
      const chave = lerChave(item);
      if (chave.tipo !== "lembrete") throw new NaoEncontrado("Lembrete");
      const antes = await fotoAtual(userId, "lembrete", chave.id);
      if (!antes) throw new NaoEncontrado("Lembrete");
      if (antes.concluido) return { texto: "Esse lembrete já estava concluído. Nada mudou." };
      const salvo = await concluirLembrete(userId, chave.id, true);
      await gravarAcao({
        runId,
        userId,
        tipo: "concluido",
        entidade: "lembrete",
        entidadeId: chave.id,
        antes,
        depois: await fotoAtual(userId, "lembrete", chave.id),
        descricao: descricao(
          salvo.areaId,
          salvo.texto,
          salvo.repetiu
            ? [
                {
                  rotulo: "Próxima vez",
                  antes: quandoTexto(new Date(antes.quando as string), null, fuso),
                  depois: quandoTexto(salvo.quando, null, fuso),
                },
              ]
            : [{ rotulo: "Situação", antes: "Aberto", depois: "Concluído" }],
        ),
      });
      return { texto: "Lembrete concluído." };
    }

    case "concluir_sessao_estudo": {
      const { data, turno } = esquemas.concluir_sessao_estudo.parse(entrada);
      const doDia = await sessoesEntre(userId, data, data);
      const candidatas = turno
        ? doDia.filter((x) => x.turno === turno)
        : doDia.filter((x) => x.status === "pendente");
      if (!doDia.length || (turno && !candidatas.length))
        throw new NaoEncontrado("Sessão de estudo nesse dia");
      if (!candidatas.length || candidatas[0].status === "feita")
        return { texto: "Essa sessão já estava feita. Nada mudou." };
      if (candidatas.length > 1)
        throw new Conflito(
          `Há ${candidatas.length} sessões pendentes nesse dia (${candidatas.map((x) => x.turno).join(" e ")}): diga o turno.`,
        );
      const [sessao] = candidatas;
      const antes = await fotoAtual(userId, "sessao", sessao.id);
      await marcarSessao(userId, sessao.id, true);
      await gravarAcao({
        runId,
        userId,
        tipo: "concluido",
        entidade: "sessao",
        entidadeId: sessao.id,
        antes,
        depois: await fotoAtual(userId, "sessao", sessao.id),
        descricao: descricao("estudos", tituloDaSessao(sessao), [
          { rotulo: "Sessão", antes: "Pendente", depois: "Feita" },
        ]),
      });
      return { texto: "Sessão marcada como feita." };
    }

    case "criar_avaliacao": {
      const a = esquemas.criar_avaliacao.parse(entrada);
      const criada = await criarAvaliacao(
        userId,
        avaliacaoSchema.parse({
          tipo: a.tipo,
          titulo: a.titulo,
          subjectId: a.disciplina_id,
          data: a.data,
          hora: a.hora,
        }),
      );
      const disciplina = criada.subjectId ? await obterDisciplina(userId, criada.subjectId) : null;
      await gravarAcao({
        runId,
        userId,
        tipo: "criado",
        entidade: "avaliacao",
        entidadeId: criada.id,
        antes: null,
        depois: await fotoAtual(userId, "avaliacao", criada.id),
        descricao: descricao("provas", criada.titulo, [
          { rotulo: "Data", antes: null, depois: quandoTexto(criada.entregaEm, null, fuso) },
          ...(disciplina ? [{ rotulo: "Disciplina", antes: null, depois: disciplina.nome }] : []),
        ]),
      });
      return { texto: "Avaliação cadastrada." };
    }

    case "marcar_falta": {
      const f = esquemas.marcar_falta.parse(entrada);
      const disciplina = await obterDisciplina(userId, f.disciplina_id);
      const [existente] = await db()
        .select({ id: absences.id })
        .from(absences)
        .where(and(eq(absences.subjectId, f.disciplina_id), eq(absences.data, f.data)));
      const antes = existente ? await fotoAtual(userId, "falta", existente.id) : null;
      const falta = await registrarFalta(
        userId,
        f.disciplina_id,
        faltaSchema.parse({ data: f.data, quantidade: f.quantidade ?? 1 }),
      );
      const qtd = (n: number) => `${n} ${n === 1 ? "falta" : "faltas"}`;
      await gravarAcao({
        runId,
        userId,
        tipo: antes ? "alterado" : "criado",
        entidade: "falta",
        entidadeId: falta.id,
        antes,
        depois: await fotoAtual(userId, "falta", falta.id),
        descricao: descricao("aulas", disciplina.nome, [
          {
            rotulo: `Falta em ${dataCurta(f.data)}`,
            antes: antes ? qtd(antes.quantidade as number) : null,
            depois: qtd(falta.quantidade),
          },
        ]),
      });
      return { texto: "Falta registrada." };
    }

    case "propor_exclusao": {
      const p = esquemas.propor_exclusao.parse(entrada);
      const chave = lerChave(p.item);
      let entidade: Entidade;
      let id = chave.id;
      let desc;
      if (chave.tipo === "evento") {
        const evento = await obterEvento(userId, chave.id);
        if (p.escopo === "ocorrencia" && chave.data) {
          const o = await ocorrenciaAtual(userId, chave.id, chave.data);
          entidade = "excecao";
          id = chaveExcecao(chave.id, chave.data);
          desc = descricao(evento.areaId, evento.titulo, [
            { rotulo: "Só neste dia", antes: quandoTexto(o.inicio, o.fim, fuso), depois: null },
          ]);
        } else {
          entidade = "evento";
          const dias = diasTexto(evento.diasSemana);
          const fim = new Date(evento.inicio.getTime() + evento.duracaoMin * 60_000);
          desc = descricao(evento.areaId, evento.titulo, [
            {
              rotulo: dias ? "Todas as vezes" : "Quando",
              antes: dias
                ? `${dias} · ${horaLocal(evento.inicio, fuso)}–${horaLocal(fim, fuso)}`
                : quandoTexto(evento.inicio, fim, fuso),
              depois: null,
            },
          ]);
        }
      } else if (chave.tipo === "lembrete" || chave.tipo === "avaliacao") {
        entidade = chave.tipo;
        const foto = await fotoAtual(userId, entidade, id);
        if (!foto) throw new NaoEncontrado(chave.tipo === "lembrete" ? "Lembrete" : "Avaliação");
        const quando = new Date((foto.quando ?? foto.entregaEm) as string);
        desc = descricao(
          (chave.tipo === "avaliacao" ? "provas" : foto.areaId) as AreaId | null,
          (foto.texto ?? foto.titulo) as string,
          [{ rotulo: "Quando", antes: quandoTexto(quando, null, fuso), depois: null }],
        );
      } else {
        throw new Conflito("Sessões da trilha não podem ser apagadas.");
      }
      await gravarAcao({
        runId,
        userId,
        tipo: "apagado",
        status: "proposta",
        entidade,
        entidadeId: id,
        antes: await fotoAtual(userId, entidade, id),
        depois: null,
        descricao: desc,
      });
      return { texto: "Proposta registrada. Nada foi apagado: o usuário confirma na tela." };
    }
  }
}

// ---------------------------------------------------------------- Pedidos feitos na tela

/** Confirma uma exclusão proposta: só aqui algo é apagado, pelos mesmos serviços das telas. */
export async function executarExclusao(userId: string, entidade: Entidade, id: string) {
  switch (entidade) {
    case "evento":
      return apagarEvento(userId, id);
    case "excecao": {
      const [eventId, data] = [id.slice(0, 36), id.slice(37)];
      await salvarExcecao(userId, eventId, excecaoSchema.parse({ data, tipo: "cancelada" }));
      return;
    }
    case "lembrete":
      return apagarLembrete(userId, id);
    case "avaliacao":
      return apagarAvaliacao(userId, id);
    default:
      throw new Conflito("Esse item não pode ser apagado por aqui.");
  }
}

/** Aplica a correção sugerida para um conflito (o usuário tocou no botão) e registra a mudança. */
export async function aplicarCorrecao(ex: Execucao, c: ConflitoDaAcao) {
  if (!c.sugestao) throw new Conflito("Esse conflito não tem correção sugerida.");
  const { userId, runId } = ex;
  const [ini, fim] = c.horario.split("–");
  const novoFim = minParaHm(hmParaMin(c.sugestao) + hmParaMin(fim) - hmParaMin(ini));
  const campos = [
    {
      rotulo: `Horário em ${dataCurta(c.dia)}`,
      antes: c.horario,
      depois: `${c.sugestao}–${novoFim}`,
    },
  ];
  if (c.origem === "sessao") {
    const antes = await fotoAtual(userId, "sessao", c.id);
    await moverSessaoComChecagem(userId, c.id, c.sugestao);
    return gravarAcao({
      runId,
      userId,
      tipo: "alterado",
      entidade: "sessao",
      entidadeId: c.id,
      antes,
      depois: await fotoAtual(userId, "sessao", c.id),
      descricao: descricao("estudos", c.titulo, campos),
    });
  }
  if (c.origem === "evento") {
    const evento = await obterEvento(userId, c.id);
    const id = chaveExcecao(c.id, c.data);
    const antes = await fotoAtual(userId, "excecao", id);
    await excecaoComChecagem(
      userId,
      c.id,
      excecaoSchema.parse({ data: c.data, tipo: "movida", novaData: c.dia, novaHora: c.sugestao }),
    );
    return gravarAcao({
      runId,
      userId,
      tipo: "alterado",
      entidade: "excecao",
      entidadeId: id,
      antes,
      depois: await fotoAtual(userId, "excecao", id),
      descricao: descricao(evento.areaId, evento.titulo, campos),
    });
  }
  throw new Conflito("Esse item não pode ser movido por aqui.");
}
