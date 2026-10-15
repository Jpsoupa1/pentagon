import type { Metadata } from "next";
import Link from "next/link";
import { CartaoAgora, type OcorrenciaCliente } from "@/components/telas/CartaoAgora";
import { ListaLembretes } from "@/components/telas/ListaLembretes";
import { BotaoLink } from "@/components/ui/Botao";
import { Cartao, CartaoCabeca } from "@/components/ui/Cartao";
import { Contagem } from "@/components/ui/Contagem";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { GraficoPentagono } from "@/components/ui/GraficoPentagono";
import { LinhaAgenda } from "@/components/ui/LinhaAgenda";
import { CabecalhoPagina, layout } from "@/components/ui/Pagina";
import { TIPO_AVALIACAO_NOME } from "@/lib/dominio";
import { dataCurta, dataLonga, duracaoTexto, horaLocal, partesLocais } from "@/lib/tempo";
import type { Ocorrencia } from "@/server/agenda/recorrencia";
import { exigirUsuario } from "@/server/sessao";
import { painelHoje } from "@/server/servicos/agenda";

export const metadata: Metadata = { title: "Hoje" };

function paraCliente(o: Ocorrencia | null): OcorrenciaCliente | null {
  if (!o) return null;
  return {
    eventId: o.eventId,
    dataOriginal: o.dataOriginal,
    titulo: o.titulo,
    areaId: o.areaId,
    local: o.local,
    inicio: o.inicio.toISOString(),
    fim: o.fim.toISOString(),
  };
}

function saudacao(minutos: number) {
  if (minutos < 12 * 60) return "Bom dia";
  if (minutos < 18 * 60) return "Boa tarde";
  return "Boa noite";
}

export default async function Hoje() {
  const usuario = await exigirUsuario();
  const agora = new Date();
  const p = await painelHoje(usuario.id, agora);
  const nome = usuario.name?.split(" ")[0];
  const local = partesLocais(agora, p.fuso);
  const totalSemana = Object.values(p.minutosPorArea).reduce((a, b) => a + b, 0);

  return (
    <>
      <CabecalhoPagina
        sobre={dataLonga(p.hoje)}
        titulo={`${saudacao(local.minutos)}${nome ? `, ${nome}` : ""}`}
      />
      <div className={layout.colunas}>
        <div className={layout.pilha}>
          <CartaoAgora
            atual={paraCliente(p.atual)}
            proximo={paraCliente(p.proximo)}
            fuso={p.fuso}
            agoraServidor={Math.floor(agora.getTime() / 60_000) * 60_000}
          />
          <Cartao aria-labelledby="linha-do-dia">
            <CartaoCabeca
              titulo={<span id="linha-do-dia">Linha do dia</span>}
              acao={<Link href="/agenda">Ver agenda</Link>}
            />
            {p.doDia.length ? (
              <ul className={layout.lista}>
                {p.doDia.map((o) => (
                  <LinhaAgenda
                    key={o.chave}
                    hora={o.diaInteiro ? "dia" : horaLocal(o.inicio, p.fuso)}
                    area={o.areaId}
                    titulo={o.titulo}
                    meta={
                      o.diaInteiro
                        ? "Dia inteiro"
                        : `${horaLocal(o.inicio, p.fuso)} – ${horaLocal(o.fim, p.fuso)}${o.local ? ` · ${o.local}` : ""}${o.movida ? " · horário mudado hoje" : ""}`
                    }
                    passada={o.fim < agora}
                  />
                ))}
              </ul>
            ) : (
              <EstadoVazio>Nada na agenda de hoje.</EstadoVazio>
            )}
          </Cartao>
        </div>
        <div className={layout.pilha}>
          <Cartao aria-labelledby="equilibrio">
            <CartaoCabeca
              titulo={<span id="equilibrio">Equilíbrio da semana</span>}
              acao={<span className="mono">{duracaoTexto(totalSemana)}</span>}
            />
            <GraficoPentagono minutos={p.minutosPorArea} />
          </Cartao>
          <Cartao aria-labelledby="prazos">
            <CartaoCabeca
              titulo={<span id="prazos">Próximos prazos</span>}
              acao={<Link href="/provas">Ver todos</Link>}
            />
            {p.prazos.length ? (
              <ul className={layout.lista}>
                {p.prazos.map((a) => (
                  <li key={a.id}>
                    <Link href={`/provas?item=${a.id}`} className={layout.itemLink}>
                      <span className={layout.itemTexto}>
                        <span className={layout.itemTitulo}>{a.titulo}</span>
                        <span className={layout.meta}>
                          {TIPO_AVALIACAO_NOME[a.tipo]}
                          {a.sigla ? ` · ${a.sigla}` : ""} ·{" "}
                          <span className="mono">
                            {dataCurta(partesLocais(a.entregaEm, p.fuso).data)}
                          </span>
                        </span>
                      </span>
                      <Contagem alvo={a.entregaEm} agora={agora} fuso={p.fuso} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EstadoVazio>Nenhum prazo pela frente.</EstadoVazio>
            )}
          </Cartao>
          <Cartao aria-labelledby="lembretes-hoje">
            <CartaoCabeca
              titulo={<span id="lembretes-hoje">Lembretes</span>}
              acao={<Link href="/lembretes">Ver todos</Link>}
            />
            {p.lembretes.length ? (
              <ListaLembretes
                lembretes={p.lembretes.map((l) => ({
                  id: l.id,
                  texto: l.texto,
                  hora: horaLocal(l.quando, p.fuso),
                  concluido: l.concluido,
                  atrasado: !l.concluido && partesLocais(l.quando, p.fuso).data < p.hoje,
                }))}
              />
            ) : (
              <EstadoVazio
                acao={
                  <BotaoLink href="/lembretes" pequeno>
                    Criar lembrete
                  </BotaoLink>
                }
              >
                Nenhum lembrete para hoje.
              </EstadoVazio>
            )}
          </Cartao>
        </div>
      </div>
    </>
  );
}
