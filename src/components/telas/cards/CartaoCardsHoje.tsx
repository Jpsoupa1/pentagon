"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sessaoDoDia } from "@/lib/cards";
import { lerAcervoLocal } from "@/lib/cliente/cards";
import { useOnline } from "@/lib/cliente/hooks";
import { hojeLocal } from "@/lib/tempo";
import { BotaoLink } from "../../ui/Botao";
import { Cartao, CartaoCabeca } from "../../ui/Cartao";
import s from "./Cards.module.css";

type Contagem = { faltam: number; total: number };

/**
 * Bloco "Cards de hoje" da tela Hoje. Com conexão, vale a contagem do servidor; sem ela
 * (a página veio do cache), conta pela cópia local do acervo, que acompanha as respostas offline.
 */
export function CartaoCardsHoje({ inicial }: { inicial: Contagem }) {
  const online = useOnline();
  const [local, setLocal] = useState<Contagem | null>(null);

  useEffect(() => {
    if (online) return;
    void lerAcervoLocal().then((d) => {
      if (!d) return;
      const hoje = hojeLocal(new Date(), d.fuso);
      setLocal({
        faltam: sessaoDoDia(d.cards, d.respostas, d.limite, hoje).length,
        total: d.cards.length,
      });
    });
  }, [online]);

  const { faltam, total } = (!online && local) || inicial;
  return (
    <Cartao aria-labelledby="cards-de-hoje" data-area="estudos">
      <CartaoCabeca
        titulo={<span id="cards-de-hoje">Cards de hoje</span>}
        acao={<Link href="/cards">Ver cards</Link>}
      />
      {total ? (
        <>
          <p className={s.hojeLinha}>
            <strong>{faltam}</strong>
            <span className={s.hojeTexto}>
              {faltam === 0
                ? "tudo revisado por hoje"
                : faltam === 1
                  ? "card falta revisar"
                  : "cards faltam revisar"}
            </span>
          </p>
          <div className={s.botoes}>
            {faltam > 0 ? (
              <BotaoLink href="/cards/dia" variante="primario">
                Começar
              </BotaoLink>
            ) : null}
            <BotaoLink href="/cards/aleatorio">Tema aleatório</BotaoLink>
          </div>
        </>
      ) : (
        <div className={s.botoes}>
          <BotaoLink href="/cards/importar" variante="primario">
            Importar cards
          </BotaoLink>
        </div>
      )}
    </Cartao>
  );
}
