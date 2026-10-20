import type { Metadata } from "next";
import { SessaoCards } from "@/components/telas/cards/SessaoCards";
import { CabecalhoPagina } from "@/components/ui/Pagina";

export const metadata: Metadata = { title: "Tema aleatório" };

export default function TemaAleatorio() {
  return (
    <>
      <CabecalhoPagina sobre="Cards" titulo="Tema aleatório" />
      <SessaoCards modo="aleatorio" />
    </>
  );
}
