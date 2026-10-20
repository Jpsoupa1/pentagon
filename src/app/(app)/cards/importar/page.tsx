import type { Metadata } from "next";
import { ImportarCards } from "@/components/telas/cards/ImportarCards";
import { CabecalhoPagina } from "@/components/ui/Pagina";

export const metadata: Metadata = { title: "Importar cards" };

export default function Importar() {
  return (
    <>
      <CabecalhoPagina sobre="Cards" titulo="Importar" />
      <ImportarCards />
    </>
  );
}
