import { z } from "zod";
import {
  ALCANCE_TERRITORIAL,
  ESTADO_RECOMENDACION,
  AMBITO_RECOMENDACION,
} from "@/lib/enums";

export const alcanceEnum = z.enum(ALCANCE_TERRITORIAL);
export const estadoRecomendacionEnum = z.enum(ESTADO_RECOMENDACION);
export const ambitoRecomendacionEnum = z.enum(AMBITO_RECOMENDACION);

export const recomendacionSchema = z.object({
  titulo: z.string().min(2, "El título es obligatorio"),
  descripcion: z.string().min(2, "La descripción es obligatoria"),
  ambito: z.array(ambitoRecomendacionEnum).default([]),
  destinatarios: z.string().optional().nullable(),
  alcance: alcanceEnum.nullable().optional(),
  estado: estadoRecomendacionEnum.nullable().optional(),
  hallazgos_ids: z.array(z.string().uuid()).default([]),
});

export type RecomendacionFormValues = z.input<typeof recomendacionSchema>;
