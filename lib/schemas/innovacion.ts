import { z } from "zod";
import {
  ESTADO_EXPERIMENTACION,
  NIVEL_IMPACTO,
  RANGO_PARTICIPANTES,
  GRUPOS_POBLACION,
  OPCIONES_ESCALADO,
} from "@/lib/enums";

export const estadoInnovacionEnum = z.enum(ESTADO_EXPERIMENTACION);
export const nivelImpactoEnum = z.enum(NIVEL_IMPACTO);
export const rangoParticipantesEnum = z.enum(RANGO_PARTICIPANTES);
export const grupoPoblacionInnovacionEnum = z.enum(GRUPOS_POBLACION);
export const opcionEscaladoEnum = z.enum(OPCIONES_ESCALADO);

export const innovacionSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  descripcion: z.string().optional().nullable(),
  proyecto_id: z.string().uuid("Selecciona un proyecto"),
  estado: estadoInnovacionEnum.nullable().optional(),
  nivel_impacto: nivelImpactoEnum.nullable().optional(),
  n_participantes: rangoParticipantesEnum.nullable().optional(),
  grupos_poblacion: z.array(grupoPoblacionInnovacionEnum).default([]),
  opciones_escalado: z.array(opcionEscaladoEnum).default([]),
  enlace_referencia: z.string().optional().nullable().or(z.literal("")),
  retos_ids: z.array(z.string().uuid()).default([]),
});

export type InnovacionFormValues = z.input<typeof innovacionSchema>;
