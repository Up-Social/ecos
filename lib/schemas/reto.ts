import { z } from "zod";

export const retoSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  descripcion: z.string().optional().nullable(),
  fuente_informacion: z.string().optional().nullable(),
  is_public: z.boolean().default(false),
  misiones_ids: z.array(z.string().uuid()).default([]),
});

export type RetoFormValues = z.input<typeof retoSchema>;
