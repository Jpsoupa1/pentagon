"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AreaId } from "@/lib/dominio";
import { FolhaInferior } from "../ui/FolhaInferior";
import { FormNovoItem, type DisciplinaOpcao } from "./FormNovoItem";

type Ctx = { abrir: (inicial?: { area?: AreaId; data?: string }) => void };
const Contexto = createContext<Ctx>({ abrir: () => {} });

export const useNovoItem = () => useContext(Contexto);

export function NovoItemProvider({
  children,
  disciplinas,
}: {
  children: ReactNode;
  disciplinas: DisciplinaOpcao[];
}) {
  const [aberto, setAberto] = useState(false);
  const [inicial, setInicial] = useState<{ area?: AreaId; data?: string }>({});
  const abrir = useCallback((i: { area?: AreaId; data?: string } = {}) => {
    setInicial(i);
    setAberto(true);
  }, []);
  const valor = useMemo(() => ({ abrir }), [abrir]);
  return (
    <Contexto.Provider value={valor}>
      {children}
      <FolhaInferior aberta={aberto} aoFechar={() => setAberto(false)} titulo="Novo item">
        <FormNovoItem
          disciplinas={disciplinas}
          inicial={inicial}
          aoSalvar={() => setAberto(false)}
        />
      </FolhaInferior>
    </Contexto.Provider>
  );
}
