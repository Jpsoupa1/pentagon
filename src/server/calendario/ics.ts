import { addDias } from "@/lib/tempo";

// Gerador de .ics (RFC 5545) no mesmo formato do gerador original da trilha.

export type EventoIcs =
  | {
      tipo: "hora";
      uid: string;
      data: string;
      inicioMin: number;
      minutos: number;
      titulo: string;
      descricao?: string;
      categoria?: string;
      alarmeMin: number;
      /** Alertas extras, no formato de TRIGGER (ex.: "-P1D"). */
      alarmesExtras?: string[];
    }
  | { tipo: "dia"; uid: string; data: string; titulo: string; alarme: string; alarmeTexto: string };

const pad = (n: number) => String(n).padStart(2, "0");

export function esc(t: string) {
  return String(t)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** No máximo 75 octetos por linha; a continuação começa com espaço. */
export function dobrar(linha: string) {
  const enc = new TextEncoder();
  const out: string[] = [];
  let atual = "";
  let tam = 0;
  for (const c of linha) {
    const b = enc.encode(c).length;
    if (tam + b > 75) {
      out.push(atual);
      atual = " ";
      tam = 1;
    }
    atual += c;
    tam += b;
  }
  out.push(atual);
  return out.join("\r\n");
}

function stampLocal(data: string, minutos: number) {
  const dia = addDias(data, Math.floor(minutos / 1440));
  const m = ((minutos % 1440) + 1440) % 1440;
  return `${dia.replace(/-/g, "")}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`;
}

function stampUTC(d: Date) {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function linhasDoEvento(e: EventoIcs, fuso: string, dtstamp: string): string[] {
  if (e.tipo === "dia") {
    return [
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${e.data.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${addDias(e.data, 1).replace(/-/g, "")}`,
      `SUMMARY:${esc(e.titulo)}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(e.alarmeTexto)}`,
      `TRIGGER:${e.alarme}`,
      "END:VALARM",
      "END:VEVENT",
    ];
  }
  return [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${fuso}:${stampLocal(e.data, e.inicioMin)}`,
    `DTEND;TZID=${fuso}:${stampLocal(e.data, e.inicioMin + e.minutos)}`,
    `SUMMARY:${esc(e.titulo)}`,
    ...(e.descricao ? [`DESCRIPTION:${esc(e.descricao)}`] : []),
    ...(e.categoria ? [`CATEGORIES:${esc(e.categoria)}`] : []),
    "TRANSP:OPAQUE",
    ...[...(e.alarmesExtras ?? []), e.alarmeMin > 0 ? `-PT${e.alarmeMin}M` : "PT0M"].flatMap(
      (gatilho) => [
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${esc(e.titulo)}`,
        `TRIGGER:${gatilho}`,
        "END:VALARM",
      ],
    ),
    "END:VEVENT",
  ];
}

export function gerarCalendario(opcoes: {
  nome: string;
  fuso: string;
  eventos: EventoIcs[];
  agora?: Date;
}) {
  const dtstamp = stampUTC(opcoes.agora ?? new Date());
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pentagon//Agenda pessoal//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(opcoes.nome)}`,
    `X-WR-TIMEZONE:${opcoes.fuso}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    "BEGIN:VTIMEZONE",
    `TZID:${opcoes.fuso}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0300",
    "TZOFFSETTO:-0300",
    "TZNAME:-03",
    "END:STANDARD",
    "END:VTIMEZONE",
    ...opcoes.eventos.flatMap((e) => linhasDoEvento(e, opcoes.fuso, dtstamp)),
    "END:VCALENDAR",
  ];
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}
