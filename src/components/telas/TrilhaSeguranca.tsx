import type { ReactNode } from "react";
import { dataNumerica, textoFaltam } from "@/lib/roadmap";
import { difDias } from "@/lib/tempo";
import type { segurancaEm } from "@/server/roadmap/compartilhamento";
import { BotaoLink } from "../ui/Botao";
import { Cartao, CartaoCabeca, Rotulo } from "../ui/Cartao";
import { EstadoVazio } from "../ui/EstadoVazio";
import p from "../ui/Pagina.module.css";
import s from "./TrilhaSeguranca.module.css";

/**
 * Trilha Segurança em Estudos: a fase do Roadmap em que hoje cai (com as pausas para a DevOps),
 * o portão dela e as sessões desta semana. O detalhe (requisitos, cursos, provas) fica no Roadmap.
 */
export function TrilhaSeguranca({
  slug,
  nome,
  estado,
  hoje,
  sessoes,
}: {
  slug: string;
  nome: string;
  estado: ReturnType<typeof segurancaEm>;
  hoje: string;
  /** Linhas da agenda (LinhaAgenda) com as sessões desta semana. */
  sessoes: ReactNode[];
}) {
  const dias = difDias(hoje, estado.portaoData);
  return (
    <Cartao aria-labelledby="trilha-seguranca">
      <CartaoCabeca
        titulo={<span id="trilha-seguranca">{nome}</span>}
        acao={
          <span className="mono">
            Fase {estado.numero}/{estado.total}
          </span>
        }
      />
      <div className={p.pilha} style={{ gap: 14 }}>
        <div className={s.fase}>
          <Rotulo>{estado.pausa ? "Em pausa" : "Fase atual"}</Rotulo>
          <span className={s.nome}>
            <span className={s.ponto} style={{ background: estado.cor }} aria-hidden />
            {estado.nome}
          </span>
          {estado.pausa && (
            <p className={p.meta}>
              {estado.pausa.rotulo}: as tardes de terça e quinta voltam para a DevOps até{" "}
              <span className="mono">{dataNumerica(estado.pausa.fim)}</span>. O sábado continua.
            </p>
          )}
          <p className={p.meta}>
            Portão: {estado.portao} · <span className="mono">{textoFaltam(dias)}</span>
          </p>
        </div>
        <div className={s.fase}>
          <Rotulo>Nesta semana</Rotulo>
          {sessoes.length ? (
            <ul className={p.lista}>{sessoes}</ul>
          ) : (
            <EstadoVazio>Nenhuma sessão nesta semana.</EstadoVazio>
          )}
        </div>
        <BotaoLink href={`/trilhas/${slug}/roadmap`} pequeno>
          Ver o roadmap da Segurança
        </BotaoLink>
      </div>
    </Cartao>
  );
}
