import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { CabecalhoPagina } from "@/components/ui/Pagina";

/** Conta fora do OWNER_EMAILS: o servidor devolve `plano: null` e nenhuma escrita é tentada. */
export function SemPlano() {
  return (
    <>
      <CabecalhoPagina titulo="Plano" />
      <EstadoVazio>Nenhum plano de estudos nesta conta.</EstadoVazio>
    </>
  );
}
