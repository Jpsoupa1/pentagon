import { Cartao, CartaoCabeca } from "../../ui/Cartao";
import { AnotarErro } from "../AnotarErro";
import { RevisaoEspacada, type ErroCliente } from "../RevisaoEspacada";

/**
 * O caderno de erros do dono, já que /estudos leva ao plano. Mostra os erros com revisão vencida
 * e o botão de anotar um novo; revisar usa a mesma rota de sempre.
 */
export function CadernoNoPlano({ erros, hoje }: { erros: ErroCliente[]; hoje: string }) {
  return (
    <Cartao aria-labelledby="caderno-de-erros">
      <CartaoCabeca
        titulo={<span id="caderno-de-erros">Caderno de erros</span>}
        acao={<span className="mono">{erros.length}</span>}
      />
      <RevisaoEspacada erros={erros} />
      <AnotarErro variante="secundario" padrao={{ data: hoje, tema: "", origem: "pratica" }} />
    </Cartao>
  );
}
