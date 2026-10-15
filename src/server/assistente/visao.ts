import "server-only";
import { type AcaoVisivel, type ExecucaoVisivel, type ItemDeConsulta } from "@/lib/assistente";
import { dataCurta, dataLonga, hmParaMin, partesLocais } from "@/lib/tempo";
import type { JanelaConsulta } from "../db/schema";
import { obterAjustes } from "../servicos/ajustes";
import { agenda } from "../servicos/agenda";
import { listarLembretes } from "../servicos/lembretes";
import { obterExecucao } from "./executar";
import { quandoTexto } from "./registro";

/** Resposta de consulta montada com os dados do app (a IA só escolheu o período). */
async function montarConsulta(userId: string, j: JanelaConsulta) {
  const { fuso } = await obterAjustes(userId);
  const [a, lembretes] = await Promise.all([
    agenda(userId, { de: j.de, ate: j.ate }),
    listarLembretes(userId),
  ]);
  const naJanela = (inicio: Date, fim: Date = inicio) => {
    const ini = partesLocais(inicio, fuso);
    const fi = partesLocais(fim, fuso);
    if (fi.data < j.de || ini.data > j.ate) return false;
    if (j.horaInicio && fi.minutos <= hmParaMin(j.horaInicio) && fi.data === ini.data) return false;
    if (j.horaFim && ini.minutos >= hmParaMin(j.horaFim)) return false;
    return true;
  };
  const areaOk = (area: string | null) =>
    !j.areas?.length || (!!area && j.areas.includes(area as never));
  const itens: (ItemDeConsulta & { ordem: number })[] = [
    ...a.ocorrencias
      .filter((o) => naJanela(o.inicio, o.fim) && (o.diaInteiro ? !j.horaInicio : true))
      .filter((o) => areaOk(o.areaId))
      .map((o) => ({
        chave: o.chave,
        titulo: o.titulo,
        areaId: o.areaId,
        quando: o.diaInteiro
          ? `${dataCurta(partesLocais(o.inicio, fuso).data)} · dia todo`
          : quandoTexto(o.inicio, o.fim, fuso),
        feito: !!o.feita,
        ordem: o.inicio.getTime(),
      })),
    ...a.prazos
      .filter((p) => naJanela(p.entregaEm) && areaOk("provas"))
      .map((p) => ({
        chave: `avaliacao:${p.id}`,
        titulo: `${p.titulo}${p.sigla ? ` · ${p.sigla}` : ""}`,
        areaId: "provas" as const,
        quando: quandoTexto(p.entregaEm, null, fuso),
        feito: !!p.concluidaEm,
        ordem: p.entregaEm.getTime(),
      })),
    ...lembretes
      .filter((l) => naJanela(l.quando) && areaOk(l.areaId))
      .map((l) => ({
        chave: `lembrete:${l.id}`,
        titulo: `Lembrete: ${l.texto}`,
        areaId: l.areaId,
        quando: quandoTexto(l.quando, null, fuso),
        feito: l.concluido,
        ordem: l.quando.getTime(),
      })),
  ].sort((x, y) => x.ordem - y.ordem);

  const dias = j.de === j.ate ? dataLonga(j.de) : `${dataCurta(j.de)} a ${dataCurta(j.ate)}`;
  const horas =
    j.horaInicio || j.horaFim ? `, ${j.horaInicio ?? "00:00"}–${j.horaFim ?? "24:00"}` : "";
  return {
    titulo: `${dias}${horas}`,
    itens: itens.map((i) => ({
      chave: i.chave,
      titulo: i.titulo,
      areaId: i.areaId,
      quando: i.quando,
      feito: i.feito,
    })),
  };
}

/** O que a tela mostra de uma execução: tudo tirado de `assistant_actions` e do banco. */
export async function visaoDaExecucao(userId: string, runId: string): Promise<ExecucaoVisivel> {
  const r = await obterExecucao(userId, runId);
  const acoes: AcaoVisivel[] = r.acoes.map((a) => ({
    id: a.id,
    tipo: a.tipo,
    status: a.status,
    areaId: a.descricao.areaId,
    titulo: a.descricao.titulo,
    campos: a.descricao.campos,
    conflitos: a.conflitos.map((c) => ({
      titulo: c.titulo,
      horario: c.horario,
      correcao: c.sugestao
        ? `Mover ${c.origem === "sessao" ? "sessão" : c.titulo} para ${c.sugestao}`
        : null,
    })),
    conflitoDecisao: a.conflitoDecisao,
  }));
  return {
    id: r.id,
    texto: r.texto,
    tipo: r.tipo,
    ignorouParte: r.ignorouParte,
    acoes: r.tipo === "fora_do_escopo" ? [] : acoes,
    consulta: r.tipo === "consulta" && r.consulta ? await montarConsulta(userId, r.consulta) : null,
    falhas: r.falhas.map((f) => f.mensagem),
  };
}
