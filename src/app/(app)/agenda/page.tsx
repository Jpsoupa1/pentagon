import type { Metadata } from "next";
import { Agenda } from "@/components/telas/Agenda";
import { CabecalhoPagina } from "@/components/ui/Pagina";
import { addDias, dataCurta, hojeLocal } from "@/lib/tempo";
import { dataSchema } from "@/lib/validacao";
import { exigirUsuario } from "@/server/sessao";
import { agenda, semanaDe } from "@/server/servicos/agenda";
import { obterAjustes } from "@/server/servicos/ajustes";

export const metadata: Metadata = { title: "Agenda" };

export default async function PaginaAgenda({ searchParams }: PageProps<"/agenda">) {
  const usuario = await exigirUsuario();
  const { fuso } = await obterAjustes(usuario.id);
  const { semana } = await searchParams;
  const base = dataSchema.safeParse(semana).success
    ? (semana as string)
    : hojeLocal(new Date(), fuso);
  const intervalo = semanaDe(base);
  const dados = await agenda(usuario.id, intervalo);
  const ano = intervalo.ate.slice(0, 4);

  return (
    <>
      <CabecalhoPagina
        sobre={`Semana de ${dataCurta(intervalo.de)} a ${dataCurta(addDias(intervalo.de, 6))} de ${ano}`}
        titulo="Agenda"
      />
      <Agenda
        de={intervalo.de}
        fuso={dados.fuso}
        ocorrencias={dados.ocorrencias.map((o) => ({
          chave: o.chave,
          origem: o.origem,
          eventId: o.eventId,
          dataOriginal: o.dataOriginal,
          recorrente: o.recorrente,
          titulo: o.titulo,
          areaId: o.areaId,
          local: o.local,
          inicio: o.inicio.toISOString(),
          fim: o.fim.toISOString(),
          diaInteiro: o.diaInteiro,
          movida: o.movida,
        }))}
        prazos={dados.prazos.map((p) => ({
          id: p.id,
          tipo: p.tipo,
          titulo: p.titulo,
          sigla: p.sigla,
          entregaEm: p.entregaEm.toISOString(),
        }))}
      />
    </>
  );
}
