"use client";

import Link from "next/link";
import { useState } from "react";
import { estatisticas, sessaoDoDia } from "@/lib/cards";
import { useAcervo } from "@/lib/cliente/cards";
import { BarraProgresso } from "../../ui/BarraProgresso";
import { BotaoLink } from "../../ui/Botao";
import { Cartao, CartaoCabeca } from "../../ui/Cartao";
import { EstadoVazio } from "../../ui/EstadoVazio";
import { layout } from "../../ui/Pagina";
import { AcervoVazio, AvisoAcervo, FiltrosTrilhaTema, type Filtro } from "./comum";
import s from "./Cards.module.css";

const pct = (taxa: number) => `${Math.round(taxa * 100)}%`;

/** Tela /cards: quantos faltam hoje, os dois modos e as estatísticas. */
export function PainelCards() {
  const { dados, estado, hoje } = useAcervo();
  const [filtro, setFiltro] = useState<Filtro>({ trilha: "", tema: "" });

  if (!dados || !hoje) return <AvisoAcervo estado={estado} />;
  if (!dados.cards.length) return <AcervoVazio />;

  const faltam = sessaoDoDia(dados.cards, dados.respostas, dados.limite, hoje).length;
  const filtrados = dados.cards.filter(
    (c) =>
      (!filtro.trilha || c.trilha === filtro.trilha) && (!filtro.tema || c.tema === filtro.tema),
  );
  const e = estatisticas(filtrados, dados.respostas, hoje);
  const respondidos = e.porTema.filter((t) => t.taxa !== null);

  return (
    <div className={layout.colunas}>
      <div className={layout.pilha}>
        <section className={s.destaque} aria-labelledby="sessao-do-dia">
          <span className={s.destaqueRotulo} id="sessao-do-dia">
            Sessão do dia
          </span>
          <p className={s.destaqueNumero}>
            <strong>{faltam}</strong> {faltam === 1 ? "card para hoje" : "cards para hoje"}
          </p>
          <p className={s.destaqueMeta}>
            {faltam
              ? `Limite de ${dados.limite} por dia. Atrasados primeiro, depois os do caderno de erros e os novos.`
              : "Tudo revisado por hoje. O tema aleatório continua liberado."}
          </p>
          <div className={s.botoesDestaque}>
            {faltam > 0 && (
              <BotaoLink href="/cards/dia" variante="primario" className={s.comecar}>
                Começar
              </BotaoLink>
            )}
            <BotaoLink href="/cards/aleatorio" variante="claro">
              Tema aleatório
            </BotaoLink>
          </div>
        </section>
        <Cartao aria-labelledby="por-caixa">
          <CartaoCabeca
            titulo={<span id="por-caixa">Cards por caixa</span>}
            acao={<span className="mono">{e.total}</span>}
          />
          <FiltrosTrilhaTema cards={dados.cards} valor={filtro} aoMudar={setFiltro} />
          <div className={s.caixas}>
            <div className={s.caixa}>
              <strong>{e.novos}</strong>
              <span>Novos</span>
            </div>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className={s.caixa}>
                <strong>{e.porCaixa[n]}</strong>
                <span>Caixa {n}</span>
              </div>
            ))}
          </div>
          <p className={layout.meta} style={{ marginTop: 12 }}>
            {e.erradosNaSemana}{" "}
            {e.erradosNaSemana === 1 ? "card errado nesta semana" : "cards errados nesta semana"}
            {e.suspensos ? ` · ${e.suspensos} suspenso${e.suspensos === 1 ? "" : "s"}` : ""}
          </p>
        </Cartao>
      </div>
      <div className={layout.pilha}>
        <Cartao aria-labelledby="acerto-por-tema">
          <CartaoCabeca titulo={<span id="acerto-por-tema">Acerto por tema</span>} />
          {respondidos.length ? (
            <ul className={s.temas}>
              {respondidos.map((t) => (
                <li key={`${t.trilha}/${t.tema}`} className={s.tema}>
                  <span className={s.temaTopo}>
                    <span>
                      {t.tema} <span className={layout.meta}>· {t.trilha}</span>
                    </span>
                    <span>
                      {pct(t.taxa!)} · {t.acertos + t.erros}
                    </span>
                  </span>
                  <BarraProgresso valor={t.taxa!} rotulo={`Acerto em ${t.tema}`} />
                </li>
              ))}
            </ul>
          ) : (
            <EstadoVazio>Nenhuma resposta ainda.</EstadoVazio>
          )}
        </Cartao>
        <Cartao aria-label="Acervo">
          <ul className={layout.lista}>
            <li>
              <Link href="/cards/acervo" className={layout.itemLink}>
                <span className={layout.itemTexto}>
                  <span className={layout.itemTitulo}>Acervo</span>
                  <span className={layout.meta}>Ver, editar, suspender ou apagar cards</span>
                </span>
              </Link>
            </li>
            <li>
              <Link href="/cards/importar" className={layout.itemLink}>
                <span className={layout.itemTexto}>
                  <span className={layout.itemTitulo}>Importar</span>
                  <span className={layout.meta}>Colar o JSON dos chats de estudo</span>
                </span>
              </Link>
            </li>
          </ul>
        </Cartao>
      </div>
    </div>
  );
}
