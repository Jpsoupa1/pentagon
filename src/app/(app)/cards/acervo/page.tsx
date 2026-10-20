import type { Metadata } from "next";
import { AcervoCards } from "@/components/telas/cards/AcervoCards";
import { BotaoLink } from "@/components/ui/Botao";
import { CabecalhoPagina } from "@/components/ui/Pagina";

export const metadata: Metadata = { title: "Acervo de cards" };

export default function Acervo() {
  return (
    <>
      <CabecalhoPagina
        sobre="Cards"
        titulo="Acervo"
        acoes={
          <BotaoLink href="/cards/importar" pequeno>
            Importar
          </BotaoLink>
        }
      />
      <AcervoCards />
    </>
  );
}
