import { z } from "zod";

// -----------------------------------------------------------------------------
// Schemas Zod del Knowledge Graph (Fase 03).
// - relationshipTypeSchema : catálogo de tipos de relación.
// - relationshipSchema     : aristas entre entidades de dominio.
// Mensajes de validación en español.
// -----------------------------------------------------------------------------

/** Entidades de dominio que pueden participar en el grafo. */
export const ENTITY_TYPES = [
  "misiones",
  "retos",
  "agentes",
  "proyectos",
  "innovaciones",
  "hallazgos",
  "recomendaciones",
] as const;

export const entityTypeEnum = z.enum(ENTITY_TYPES);

export const ENTITY_TYPE_LABELS: Record<(typeof ENTITY_TYPES)[number], string> = {
  misiones: "Misión",
  retos: "Reto",
  agentes: "Agente",
  proyectos: "Proyecto",
  innovaciones: "Innovación",
  hallazgos: "Hallazgo",
  recomendaciones: "Recomendación",
};

// -----------------------------------------------------------------------------
// Tipo de relación (catálogo)
// -----------------------------------------------------------------------------
export const relationshipTypeSchema = z.object({
  code: z
    .string()
    .min(2, "El código es obligatorio")
    .regex(
      /^[a-z0-9_]+$/,
      "El código solo puede contener minúsculas, números y guiones bajos",
    ),
  name: z.string().min(2, "El nombre es obligatorio"),
  description: z.string().optional().nullable(),
  source_entity_type: entityTypeEnum.nullable().optional(),
  target_entity_type: entityTypeEnum.nullable().optional(),
  active: z.boolean().default(true),
});

export type RelationshipTypeFormValues = z.input<typeof relationshipTypeSchema>;

// -----------------------------------------------------------------------------
// Relación (arista del grafo)
// -----------------------------------------------------------------------------
export const relationshipSchema = z
  .object({
    source_entity_type: entityTypeEnum,
    source_entity_id: z.string().uuid("Selecciona la entidad de origen"),
    relationship_type_id: z.string().uuid("Selecciona el tipo de relación"),
    target_entity_type: entityTypeEnum,
    target_entity_id: z.string().uuid("Selecciona la entidad de destino"),
    description: z.string().optional().nullable(),
  })
  .refine(
    (v) =>
      !(
        v.source_entity_type === v.target_entity_type &&
        v.source_entity_id === v.target_entity_id
      ),
    {
      message: "Una entidad no puede relacionarse consigo misma",
      path: ["target_entity_id"],
    },
  );

export type RelationshipFormValues = z.input<typeof relationshipSchema>;
