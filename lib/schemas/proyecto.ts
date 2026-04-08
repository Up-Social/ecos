import { z } from "zod";
import { ESTADO_PROYECTO, GRUPOS_POBLACION } from "@/lib/enums";

export const estadoProyectoEnum = z.enum(ESTADO_PROYECTO);
export const grupoPoblacionEnum = z.enum(GRUPOS_POBLACION);

export const proyectoSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  descripcion: z.string().optional().nullable(),
  agente_lider_id: z.string().uuid("Selecciona un agente líder"),
  estado: estadoProyectoEnum.nullable().optional(),
  financiador: z.string().optional().nullable(),
  grupos_poblacion: z.array(grupoPoblacionEnum).default([]),
  ccaa: z.string().optional().nullable(),
  enlace_1: z.string().optional().nullable().or(z.literal("")),
});

export type ProyectoFormValues = z.input<typeof proyectoSchema>;
