"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviar } from "@/lib/cliente/api";
import { FormNovoItem, type DisciplinaOpcao, type ValoresAvaliacao } from "../shell/FormNovoItem";
import { Botao } from "../ui/Botao";
import { FolhaInferior } from "../ui/FolhaInferior";

/** Editar (nota, peso, data, anotações...) ou apagar uma prova/entrega. */
export function EditarAvaliacao({
  id,
  valores,
  disciplinas,
}: {
  id: string;
  valores: ValoresAvaliacao;
  disciplinas: DisciplinaOpcao[];
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function apagar() {
    setOcupado(true);
    const r = await enviar("DELETE", `/api/avaliacoes/${id}`);
    setOcupado(false);
    if (r.ok) router.push("/provas");
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <Botao variante="secundario" onClick={() => setAberta(true)}>
        Editar
      </Botao>
      {confirmar ? (
        <>
          <span style={{ fontSize: 13 }}>Apagar de vez?</span>
          <Botao variante="secundario" pequeno onClick={apagar} disabled={ocupado}>
            Sim, apagar
          </Botao>
          <Botao variante="fantasma" pequeno onClick={() => setConfirmar(false)}>
            Não
          </Botao>
        </>
      ) : (
        <Botao variante="fantasma" onClick={() => setConfirmar(true)}>
          Apagar
        </Botao>
      )}
      <FolhaInferior
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo="Editar prova ou entrega"
      >
        <FormNovoItem
          disciplinas={disciplinas}
          editar={{ tipo: "avaliacao", id, valores }}
          aoSalvar={() => setAberta(false)}
        />
      </FolhaInferior>
    </div>
  );
}
