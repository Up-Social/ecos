import { z } from "zod";

export const nivelEvidenciaEnum = z.enum([
  "practica_documentada",
  "datos_sistematicos",
  "evaluacion_estructurada",
  "evidencia_replicada",
]);

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
  validado: z.boolean().default(false),
});

export type HallazgoFormValues = z.input<typeof hallazgoSchema>;
