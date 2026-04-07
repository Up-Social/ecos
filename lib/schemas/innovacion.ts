import { z } from "zod";

export const estadoInnovacionEnum = z.enum([
  "diseno",
  "prototipo",
  "implementacion",
  "testeado",
  "escalado",
]);

export const nivelImpactoEnum = z.enum([
  "comunitaria",
  "local",
  "autonomica",
  "estatal",
  "internacional",
]);

export const innovacionSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  descripcion: z.string().optional().nullable(),
  proyecto_id: z.string().uuid("Selecciona un proyecto"),
  estado: estadoInnovacionEnum.nullable().optional(),
  nivel_impacto: nivelImpactoEnum.nullable().optional(),
  n_participantes: z.string().optional().nullable(),
  retos_ids: z.array(z.string().uuid()).default([]),
});

export type InnovacionFormValues = z.input<typeof innovacionSchema>;
