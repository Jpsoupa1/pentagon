import "server-only";
import { TIPO_AVALIACAO_NOME, type AreaId } from "@/lib/dominio";
import { paraUtc } from "@/lib/tempo";
import { obterAjustes } from "./ajustes";
import { proximosPrazos as proximasAvaliacoes } from "./avaliacoes";
import { obterTrilha } from "./estudos";

export type Prazo = {
  chave: string;
  titulo: string;
  descricao: string;
  quando: Date;
  area: AreaId;
  href: string;
};

/** Provas e entregas abertas + marcos da trilha, do mais próximo ao mais distante. */
export async function proximosPrazos(userId: string, desde: Date, limite = 5): Promise<Prazo[]> {
  const [{ fuso }, avaliacoes, trilha] = await Promise.all([
    obterAjustes(userId),
    proximasAvaliacoes(userId, desde, limite),
    obterTrilha(userId),
  ]);
  const prazos: Prazo[] = avaliacoes.map((a) => ({
    chave: `avaliacao:${a.id}`,
    titulo: a.titulo,
    descricao: `${TIPO_AVALIACAO_NOME[a.tipo]}${a.sigla ? ` · ${a.sigla}` : ""}`,
    quando: a.entregaEm,
    area: "provas",
    href: `/provas?item=${a.id}`,
  }));
  for (const m of trilha?.marcos ?? []) {
    const quando = paraUtc(m.data, "00:00", fuso);
    if (quando < desde) continue;
    prazos.push({
      chave: `marco:${m.data}`,
      titulo: m.titulo,
      descricao: m.prova ? "Certificação" : "Marco da trilha",
      quando,
      area: "estudos",
      href: "/estudos",
    });
  }
  return prazos.sort((a, b) => a.quando.getTime() - b.quando.getTime()).slice(0, limite);
}
