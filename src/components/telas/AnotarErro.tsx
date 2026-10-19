"use client";

import { useState } from "react";
import { Botao } from "../ui/Botao";
import { FolhaInferior } from "../ui/FolhaInferior";
import { FormErro, type PadraoErro } from "./FormErro";

/** Botão que abre o caderno de erros já com a data e o tema da sessão (prática da tarde). */
export function AnotarErro({
  padrao,
  variante = "claro",
}: {
  padrao: PadraoErro;
  variante?: "claro" | "secundario";
}) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <Botao variante={variante} pequeno onClick={() => setAberta(true)}>
        Anotar erro
      </Botao>
      <FolhaInferior aberta={aberta} aoFechar={() => setAberta(false)} titulo="Caderno de erros">
        <FormErro padrao={padrao} />
      </FolhaInferior>
    </>
  );
}
