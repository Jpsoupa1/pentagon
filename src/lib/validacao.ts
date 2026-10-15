import { z } from "zod";
import { areaIds, assessmentKinds, repeticoes } from "./dominio";

// Esquemas compartilhados entre formulários (cliente) e API (servidor).

const texto = (max: number) => z.string().trim().min(1, "Obrigatório").max(max);
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)");
export const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM)");
export const areaSchema = z.enum(areaIds);
const minutosAntes = z
  .number()
  .int()
  .min(0)
  .max(10_080)
  .nullish()
  .transform((v) => v ?? null);

export const eventoSchema = z
  .object({
    titulo: texto(120),
    areaId: areaSchema,
    subjectId: z
      .uuid()
      .nullish()
      .transform((v) => v ?? null),
    local: textoOpcional(120),
    notas: textoOpcional(2000),
    data: dataSchema,
    hora: horaSchema.default("00:00"),
    duracaoMin: z.number().int().min(5).max(10_080),
    diaInteiro: z.boolean().default(false),
    diasSemana: z
      .array(z.number().int().min(0).max(6))
      .max(7)
      .nullish()
      .transform((v) => (v && v.length ? [...new Set(v)].sort() : null)),
    repeteAte: dataSchema.nullish().transform((v) => v ?? null),
    lembrarMin: minutosAntes,
    ignorarConflito: z.boolean().default(false),
  })
  .refine((e) => !e.repeteAte || e.repeteAte >= e.data, {
    message: "O fim da repetição precisa ser depois do início",
    path: ["repeteAte"],
  });
export type EventoEntrada = z.input<typeof eventoSchema>;

export const excecaoSchema = z
  .object({
    data: dataSchema,
    tipo: z.enum(["cancelada", "movida"]),
    novaData: dataSchema.optional(),
    novaHora: horaSchema.optional(),
    novaDuracaoMin: z.number().int().min(5).max(1440).optional(),
    motivo: textoOpcional(200),
    ignorarConflito: z.boolean().default(false),
  })
  .refine((x) => x.tipo === "cancelada" || (x.novaData && x.novaHora), {
    message: "Informe a nova data e hora",
    path: ["novaHora"],
  });

export const disciplinaSchema = z.object({
  nome: texto(120),
  sigla: texto(12),
  professor: textoOpcional(120),
  sala: textoOpcional(60),
  limiteFaltas: z.number().int().min(0).max(200).default(0),
});

export const faltaSchema = z.object({
  data: dataSchema,
  quantidade: z.number().int().min(1).max(10).default(1),
  nota: textoOpcional(200),
});

export const avaliacaoSchema = z.object({
  tipo: z.enum(assessmentKinds),
  titulo: texto(120),
  subjectId: z
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
  data: dataSchema,
  hora: horaSchema.default("23:59"),
  peso: z
    .number()
    .min(0)
    .max(100)
    .nullish()
    .transform((v) => v ?? null),
  nota: z
    .number()
    .min(0)
    .max(100)
    .nullish()
    .transform((v) => v ?? null),
  anotacoes: textoOpcional(5000),
  concluida: z.boolean().optional(),
  lembrarMin: minutosAntes,
});

export const checklistSchema = z.object({
  texto: texto(200),
  feito: z.boolean().optional(),
  posicao: z.number().int().min(0).optional(),
});

export const lembreteSchema = z.object({
  texto: texto(200),
  data: dataSchema,
  hora: horaSchema,
  repetir: z.enum(repeticoes).default("nunca"),
  areaId: areaSchema.nullish().transform((v) => v ?? null),
  concluido: z.boolean().optional(),
});

const horarioEstudo = z.object({
  ativo: z.boolean(),
  inicio: horaSchema,
  minutos: z.number().int().min(15).max(600),
});

export const ajustesSchema = z
  .object({
    avisoMin: z.number().int().min(0).max(1440),
    periodoInicio: dataSchema.nullable(),
    periodoFim: dataSchema.nullable(),
    horariosEstudo: z.record(z.enum(["0", "1", "2", "3", "4", "5", "6"]), horarioEstudo).nullable(),
    areasNoFeed: z.array(areaSchema),
  })
  .partial()
  .refine((a) => !a.periodoInicio || !a.periodoFim || a.periodoFim >= a.periodoInicio, {
    message: "O fim do período precisa ser depois do início",
    path: ["periodoFim"],
  });

export const intervaloSchema = z
  .object({ de: dataSchema, ate: dataSchema })
  .refine((i) => i.ate >= i.de, { message: "Intervalo inválido" })
  .refine((i) => (Date.parse(i.ate) - Date.parse(i.de)) / 86_400_000 <= 92, {
    message: "Intervalo máximo de 3 meses",
  });

export const feriadoSchema = z.object({
  data: dataSchema,
  nome: texto(80),
  areasCanceladas: z.array(areaSchema).max(5).default(["aulas", "estagio"]),
});

export const feriadosNacionaisSchema = z.object({ ano: z.number().int().min(2024).max(2100) });
