import { z } from "zod";

export const estadoProyectoEnum = z.enum([
  "diseno",
  "activo",
  "finalizado",
  "escalado",
]);

export const proyectoSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  descripcion: z.string().optional().nullable(),
  agente_lider_id: z.string().uuid("Selecciona un agente líder"),
  estado: estadoProyectoEnum.nullable().optional(),
  financiador: z.string().optional().nullable(),
});

export type ProyectoFormValues = z.input<typeof proyectoSchema>;
