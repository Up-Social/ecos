import { z } from "zod";

export const misionSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  descripcion: z.string().optional().nullable(),
  problema: z.string().optional().nullable(),
});

export type MisionFormValues = z.input<typeof misionSchema>;
