import { z } from "zod";
import {
  TIPO_AGENTE,
  ROL_ECOSISTEMA,
  GRUPOS_POBLACION,
} from "@/lib/enums";

export const tipoAgenteEnum = z.enum(TIPO_AGENTE);
export const rolEcosistemaEnum = z.enum(ROL_ECOSISTEMA);
export const grupoPoblacionAgenteEnum = z.enum(GRUPOS_POBLACION);

export const agenteSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  descripcion: z.string().optional().nullable(),
  tipo_agente: tipoAgenteEnum.nullable().optional(),
  email: z
    .string()
    .email("Email no válido")
    .optional()
    .nullable()
    .or(z.literal("")),
  web: z
    .string()
    .url("URL no válida")
    .optional()
    .nullable()
    .or(z.literal("")),
  municipio_sede: z.string().optional().nullable(),
  rol_ecosistema: z.array(rolEcosistemaEnum).default([]),
  grupos_poblacion: z.array(grupoPoblacionAgenteEnum).default([]),
  personas_implicadas: z.number().int().nullable().optional(),
  presupuesto: z.number().nullable().optional(),
  latitud: z
    .number()
    .min(-90, "Latitud fuera de rango")
    .max(90, "Latitud fuera de rango")
    .nullable()
    .optional(),
  longitud: z
    .number()
    .min(-180, "Longitud fuera de rango")
    .max(180, "Longitud fuera de rango")
    .nullable()
    .optional(),
  is_public: z.boolean().default(false),
});

export type AgenteFormValues = z.input<typeof agenteSchema>;
