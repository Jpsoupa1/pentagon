import type { Metadata } from "next";
import { SessaoCards } from "@/components/telas/cards/SessaoCards";
import { CabecalhoPagina } from "@/components/ui/Pagina";

export const metadata: Metadata = { title: "Sessão do dia" };

export default function SessaoDoDia() {
  return (
    <>
      <CabecalhoPagina sobre="Cards" titulo="Sessão do dia" />
      <SessaoCards modo="dia" />
    </>
  );
}
