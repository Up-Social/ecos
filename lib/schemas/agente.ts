import { z } from "zod";

export const tipoAgenteEnum = z.enum([
  "sociedad_civil",
  "sector_publico",
  "academia",
  "sector_privado",
]);

export const agenteSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
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
});

export type AgenteFormValues = z.input<typeof agenteSchema>;
