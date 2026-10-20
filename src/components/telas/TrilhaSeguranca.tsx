import type { ReactNode } from "react";
import type { FaseTrilha } from "@/server/db/schema";
import { Cartao, CartaoCabeca, Rotulo } from "../ui/Cartao";
import { EstadoVazio } from "../ui/EstadoVazio";
import p from "../ui/Pagina.module.css";
import { MudarFase } from "./MudarFase";
import s from "./TrilhaSeguranca.module.css";

/**
 * Trilha leve, sem datas nem metas: mostra a fase em estudo, onde praticar e as sessões da
 * semana. A fase só avança quando o usuário marca a atual como consolidada.
 */
export function TrilhaSeguranca({
  slug,
  nome,
  fases,
  faseAtual,
  sessoes,
}: {
  slug: string;
  nome: string;
  fases: FaseTrilha[];
  faseAtual: number;
  /** Linhas da agenda (LinhaAgenda) com as sessões desta semana. */
  sessoes: ReactNode[];
}) {
  const fase = fases.find((f) => f.id === faseAtual) ?? fases[0];
  return (
    <Cartao aria-labelledby="trilha-seguranca">
      <CartaoCabeca
        titulo={<span id="trilha-seguranca">{nome}</span>}
        acao={
          <span className="mono">
            Fase {fase.id}/{fases.length}
          </span>
        }
      />
      <div className={p.pilha} style={{ gap: 14 }}>
        <div className={s.fase}>
          <Rotulo>Fase atual</Rotulo>
          <span className={s.nome}>{fase.nome}</span>
          <ul className={s.itens}>
            {fase.temas?.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        {!!fase.praticas?.length && (
          <div className={s.fase}>
            <Rotulo>Onde praticar</Rotulo>
            <ul className={s.itens}>
              {fase.praticas.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}
        {fase.consolidada && <p className={p.meta}>Para avançar: {fase.consolidada}</p>}
        <MudarFase
          slug={slug}
          fase={fase.id}
          primeira={fases[0].id}
          ultima={fases[fases.length - 1].id}
        />
        <div className={s.fase}>
          <Rotulo>Nesta semana</Rotulo>
          {sessoes.length ? (
            <ul className={p.lista}>{sessoes}</ul>
          ) : (
            <EstadoVazio>Nenhuma sessão nesta semana. Sem problema.</EstadoVazio>
          )}
        </div>
        <div className={s.fase}>
          <Rotulo>Fases</Rotulo>
          <ol className={s.fases}>
            {fases.map((f) => (
              <li key={f.id} aria-current={f.id === fase.id ? "step" : undefined}>
                <span>
                  {f.id}. {f.nome}
                </span>
                <span className={`${p.meta} mono`}>
                  {f.id < fase.id ? "consolidada" : f.id === fase.id ? "agora" : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Cartao>
  );
}
