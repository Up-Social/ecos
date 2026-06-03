import { z } from "zod";
import { entityTypeEnum } from "./relationship";

// -----------------------------------------------------------------------------
// Entrada de la búsqueda semántica (Fase 12). Validada en /api/search.
// -----------------------------------------------------------------------------

export const searchSchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Escribe una consulta")
    .max(500, "La consulta es demasiado larga"),
  // Restringe la búsqueda a un tipo de entidad (opcional).
  entityType: entityTypeEnum.optional(),
  // Número de resultados (top-k).
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type SearchInput = z.infer<typeof searchSchema>;
