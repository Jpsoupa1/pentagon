import type { Metadata } from "next";
import { NovoLembrete } from "@/components/telas/Acoes";
import { ListaLembretes } from "@/components/telas/ListaLembretes";
import { Cartao, CartaoCabeca } from "@/components/ui/Cartao";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { CabecalhoPagina, layout } from "@/components/ui/Pagina";
import { dataCurta, hojeLocal, horaLocal, partesLocais } from "@/lib/tempo";
import { exigirUsuario } from "@/server/sessao";
import { obterAjustes } from "@/server/servicos/ajustes";
import { listarLembretes } from "@/server/servicos/lembretes";

export const metadata: Metadata = { title: "Lembretes" };

const REPETE: Record<string, string> = {
  nunca: "",
  diario: " · todo dia",
  semanal: " · toda semana",
  mensal: " · todo mês",
};

export default async function Lembretes() {
  const usuario = await exigirUsuario();
  const { fuso } = await obterAjustes(usuario.id);
  const todos = await listarLembretes(usuario.id);
  const hoje = hojeLocal(new Date(), fuso);
  const formatar = (l: (typeof todos)[number]) => {
    const data = partesLocais(l.quando, fuso).data;
    return {
      id: l.id,
      texto: l.texto,
      hora: `${data === hoje ? "hoje" : dataCurta(data)} ${horaLocal(l.quando, fuso)}${REPETE[l.repetir]}`,
      concluido: l.concluido,
      atrasado: !l.concluido && data < hoje,
    };
  };
  const abertos = todos.filter((l) => !l.concluido);
  const feitos = todos.filter((l) => l.concluido);

  return (
    <>
      <CabecalhoPagina
        titulo="Lembretes"
        sobre={`${abertos.length} abertos`}
        acoes={<NovoLembrete />}
      />
      <div className={layout.duas}>
        <Cartao>
          <CartaoCabeca titulo="Abertos" />
          <p className={layout.meta} style={{ marginBottom: 8 }}>
            Concluir um lembrete que repete o leva para a próxima vez. O aviso chega no horário
            marcado.
          </p>
          {abertos.length ? (
            <ListaLembretes lembretes={abertos.map(formatar)} apagavel />
          ) : (
            <EstadoVazio>Nenhum lembrete aberto. Crie o primeiro.</EstadoVazio>
          )}
        </Cartao>
        <Cartao>
          <CartaoCabeca titulo="Concluídos" />
          {feitos.length ? (
            <ListaLembretes lembretes={feitos.map(formatar)} apagavel />
          ) : (
            <EstadoVazio>Nada concluído ainda.</EstadoVazio>
          )}
        </Cartao>
      </div>
    </>
  );
}
