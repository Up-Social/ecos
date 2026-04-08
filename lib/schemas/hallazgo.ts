import { z } from "zod";
import { NIVEL_EVIDENCIA, ESTADO_VALIDACION } from "@/lib/enums";

export const nivelEvidenciaEnum = z.enum(NIVEL_EVIDENCIA);
export const estadoValidacionEnum = z.enum(ESTADO_VALIDACION);

export const hallazgoSchema = z.object({
  titulo: z.string().min(2, "El título es obligatorio"),
  descripcion: z.string().min(2, "La descripción es obligatoria"),
  innovacion_id: z.string().uuid("Selecciona una innovación"),
  nivel_evidencia: nivelEvidenciaEnum.nullable().optional(),
  evidencia_cuantitativa: z.string().optional().nullable(),
  fuente: z.string().optional().nullable(),
  enlace: z
    .string()
    .url("URL no válida")
    .optional()
    .nullable()
    .or(z.literal("")),
  estado_validacion: estadoValidacionEnum.nullable().optional(),
  // Derivado de estado_validacion para compatibilidad con código antiguo
  validado: z.boolean().default(false),
});

export type HallazgoFormValues = z.input<typeof hallazgoSchema>;
