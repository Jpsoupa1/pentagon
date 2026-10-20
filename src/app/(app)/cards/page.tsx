import type { Metadata } from "next";
import { PainelCards } from "@/components/telas/cards/PainelCards";
import { BotaoLink } from "@/components/ui/Botao";
import { CabecalhoPagina } from "@/components/ui/Pagina";

export const metadata: Metadata = { title: "Cards" };

// Os dados vêm da cópia do acervo no aparelho (IndexedDB): a tela funciona sem internet.
export default function Cards() {
  return (
    <>
      <CabecalhoPagina
        sobre="Flashcards da trilha"
        titulo="Cards"
        acoes={
          <BotaoLink href="/cards/importar" pequeno>
            Importar
          </BotaoLink>
        }
      />
      <PainelCards />
    </>
  );
}
