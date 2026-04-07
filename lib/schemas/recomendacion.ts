import { z } from "zod";

export const alcanceEnum = z.enum([
  "local",
  "provincial",
  "autonomico",
  "estatal",
  "pluriautonomico",
]);

export const estadoRecomendacionEnum = z.enum([
  "formulada",
  "en_proceso",
  "adoptada",
  "descartada",
]);

export const recomendacionSchema = z.object({
  titulo: z.string().min(2, "El título es obligatorio"),
  descripcion: z.string().min(2, "La descripción es obligatoria"),
  ambito: z.array(z.string()).default([]),
  destinatarios: z.string().optional().nullable(),
  alcance: alcanceEnum.nullable().optional(),
  estado: estadoRecomendacionEnum.nullable().optional(),
  hallazgos_ids: z.array(z.string().uuid()).default([]),
});

export type RecomendacionFormValues = z.input<typeof recomendacionSchema>;
