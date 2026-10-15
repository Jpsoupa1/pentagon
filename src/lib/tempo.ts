/**
 * Datas e horas no fuso do usuário (America/Sao_Paulo por padrão), sem depender do fuso do aparelho.
 * Datas "locais" circulam como texto `AAAA-MM-DD`; instantes circulam como `Date` (UTC).
 */

export const FUSO_PADRAO = "America/Sao_Paulo";

const DIA_MS = 86_400_000;

export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
export const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

function msDeData(data: string): number {
  const [a, m, d] = data.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

function dataDeMs(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDias(data: string, n: number): string {
  return dataDeMs(msDeData(data) + n * DIA_MS);
}

export function difDias(de: string, ate: string): number {
  return Math.round((msDeData(ate) - msDeData(de)) / DIA_MS);
}

/** 0 = domingo ... 6 = sábado */
export function diaDaSemana(data: string): number {
  return new Date(msDeData(data)).getUTCDay();
}

export function segundaDe(data: string): string {
  return addDias(data, -((diaDaSemana(data) + 6) % 7));
}

export function hmParaMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export function minParaHm(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

const formatadores = new Map<string, Intl.DateTimeFormat>();
function formatador(fuso: string) {
  let f = formatadores.get(fuso);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: fuso,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatadores.set(fuso, f);
  }
  return f;
}

export type PartesLocais = { data: string; hora: string; minutos: number; diaSemana: number };

export function partesLocais(instante: Date, fuso = FUSO_PADRAO): PartesLocais {
  const p = Object.fromEntries(
    formatador(fuso)
      .formatToParts(instante)
      .map((x) => [x.type, x.value]),
  );
  const data = `${p.year}-${p.month}-${p.day}`;
  const minutos = Number(p.hour) * 60 + Number(p.minute);
  return { data, hora: minParaHm(minutos), minutos, diaSemana: diaDaSemana(data) };
}

/** Diferença (em minutos) entre a hora local do fuso e UTC naquele instante. */
function deslocamentoMin(instanteMs: number, fuso: string): number {
  const p = Object.fromEntries(
    formatador(fuso)
      .formatToParts(new Date(instanteMs))
      .map((x) => [x.type, x.value]),
  );
  const comoUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((comoUtc - instanteMs) / 60_000);
}

/** Converte data e hora locais do fuso em instante UTC. */
export function paraUtc(data: string, hora: string, fuso = FUSO_PADRAO): Date {
  const ingenuo = msDeData(data) + hmParaMin(hora) * 60_000;
  let ms = ingenuo - deslocamentoMin(ingenuo, fuso) * 60_000;
  // Segunda passada cobre mudanças de horário de verão perto do horário pedido.
  ms = ingenuo - deslocamentoMin(ms, fuso) * 60_000;
  return new Date(ms);
}

export function hojeLocal(agora = new Date(), fuso = FUSO_PADRAO): string {
  return partesLocais(agora, fuso).data;
}

export function dataCurta(data: string): string {
  const [, m, d] = data.split("-").map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)}`;
}

export function dataLonga(data: string): string {
  const [, m, d] = data.split("-").map(Number);
  return `${DIAS[diaDaSemana(data)]}, ${d} de ${MESES[m - 1]}`;
}

export function horaLocal(instante: Date, fuso = FUSO_PADRAO): string {
  return partesLocais(instante, fuso).hora;
}

export function duracaoTexto(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${pad(m)}` : `${h} h`;
}
