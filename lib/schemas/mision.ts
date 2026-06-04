import { z } from "zod";

export const misionSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  descripcion: z.string().optional().nullable(),
  problema: z.string().optional().nullable(),
  fuente_informacion: z.string().optional().nullable(),
  notas_internas: z.string().optional().nullable(),
  is_public: z.boolean().default(false),
});

export type MisionFormValues = z.input<typeof misionSchema>;
