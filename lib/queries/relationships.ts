import { createClient } from "@/lib/supabase/client";
import type {
  RelationshipFormValues,
  RelationshipTypeFormValues,
} from "@/lib/schemas/relationship";
import type {
  EntityType,
  Relationship,
  RelationshipConTipo,
  RelationshipType,
} from "@/lib/supabase/types";

// -----------------------------------------------------------------------------
// Queries del Knowledge Graph (Fase 03), desde el browser.
// Siguen la convención del proyecto: devuelven { data, error } de Supabase.
// El acceso está protegido por RLS (política panel_all → is_panel_user()).
// `created_by` lo rellena la BD automáticamente (DEFAULT auth.uid()).
// -----------------------------------------------------------------------------

const supabase = createClient();

// =============================================================================
// Opciones de entidad por tipo (para el selector de entidad destino)
// =============================================================================

export interface EntityOption {
  id: string;
  label: string;
}

// Campo legible de cada entidad de dominio (nombre / titulo).
const LABEL_FIELD: Record<EntityType, string> = {
  misiones: "nombre",
  retos: "nombre",
  agentes: "nombre",
  proyectos: "nombre",
  innovaciones: "nombre",
  hallazgos: "titulo",
  recomendaciones: "titulo",
};

/**
 * Devuelve las filas de una entidad como opciones { id, label } para selects.
 * El label es `nombre` (o `titulo` en hallazgos/recomendaciones).
 */
export async function getEntityOptions(
  entityType: EntityType,
): Promise<{ data: EntityOption[]; error: { message: string } | null }> {
  const labelField = LABEL_FIELD[entityType];
  const { data, error } = await supabase
    .from(entityType)
    .select(`id, ${labelField}`)
    .order(labelField, { ascending: true })
    .returns<Record<string, unknown>[]>();
  if (error) return { data: [], error };
  const options = (data ?? []).map((row) => ({
    id: String(row.id),
    label: String(row[labelField] ?? "(sin nombre)"),
  }));
  return { data: options, error: null };
}

// =============================================================================
// relationship_types (catálogo)
// =============================================================================

export async function getRelationshipTypes(opts: { onlyActive?: boolean } = {}) {
  let query = supabase
    .from("relationship_types")
    .select("*")
    .order("name", { ascending: true });
  if (opts.onlyActive) query = query.eq("active", true);
  return query.returns<RelationshipType[]>();
}

export async function getRelationshipType(id: string) {
  return supabase
    .from("relationship_types")
    .select("*")
    .eq("id", id)
    .single<RelationshipType>();
}

function normalizeType(values: RelationshipTypeFormValues) {
  return {
    code: values.code,
    name: values.name,
    description: values.description || null,
    source_entity_type: values.source_entity_type || null,
    target_entity_type: values.target_entity_type || null,
    active: values.active ?? true,
  };
}

export async function createRelationshipType(values: RelationshipTypeFormValues) {
  return supabase
    .from("relationship_types")
    .insert(normalizeType(values))
    .select()
    .single();
}

export async function updateRelationshipType(
  id: string,
  values: RelationshipTypeFormValues,
) {
  return supabase
    .from("relationship_types")
    .update(normalizeType(values))
    .eq("id", id)
    .select()
    .single();
}

export async function deleteRelationshipType(id: string) {
  return supabase.from("relationship_types").delete().eq("id", id);
}

// =============================================================================
// relationships (aristas)
// =============================================================================

/** Lista todas las relaciones, con su tipo embebido (nested select). */
export async function getRelationships() {
  return supabase
    .from("relationships")
    .select(
      `
      *,
      relationship_type:relationship_types ( id, code, name )
    `,
    )
    .order("created_at", { ascending: false })
    .returns<RelationshipConTipo[]>();
}

/**
 * Devuelve todas las relaciones en las que una entidad participa, ya sea como
 * origen o como destino (una sola query con filtro OR de PostgREST).
 */
export async function getRelationshipsForEntity(
  entityType: EntityType,
  entityId: string,
) {
  return supabase
    .from("relationships")
    .select(
      `
      *,
      relationship_type:relationship_types ( id, code, name )
    `,
    )
    .or(
      `and(source_entity_type.eq.${entityType},source_entity_id.eq.${entityId}),` +
        `and(target_entity_type.eq.${entityType},target_entity_id.eq.${entityId})`,
    )
    .order("created_at", { ascending: false })
    .returns<RelationshipConTipo[]>();
}

function normalizeRelationship(values: RelationshipFormValues) {
  return {
    source_entity_type: values.source_entity_type,
    source_entity_id: values.source_entity_id,
    relationship_type_id: values.relationship_type_id,
    target_entity_type: values.target_entity_type,
    target_entity_id: values.target_entity_id,
    description: values.description || null,
  };
}

export async function createRelationship(values: RelationshipFormValues) {
  return supabase
    .from("relationships")
    .insert(normalizeRelationship(values))
    .select()
    .single<Relationship>();
}

export async function updateRelationship(
  id: string,
  values: RelationshipFormValues,
) {
  return supabase
    .from("relationships")
    .update(normalizeRelationship(values))
    .eq("id", id)
    .select()
    .single<Relationship>();
}

export async function deleteRelationship(id: string) {
  return supabase.from("relationships").delete().eq("id", id);
}

// =============================================================================
// Grafo completo (para la visualización /admin/graph) — solo lectura
// =============================================================================

export interface GraphNode {
  /** Id único en el grafo: `${entityType}:${entityId}`. */
  id: string;
  entityType: EntityType;
  entityId: string;
  label: string;
}

export interface GraphEdge {
  id: string;
  source: string; // GraphNode.id
  target: string; // GraphNode.id
  label: string; // nombre del tipo de relación
  typeCode: string; // code del tipo de relación
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Construye el grafo completo a partir de `relationships`: cada relación aporta
 * una arista y dos nodos (las entidades que conecta). Las etiquetas de los nodos
 * se resuelven con `getEntityOptions` (una consulta por tipo presente).
 */
export async function getGraphData(): Promise<{
  data: GraphData;
  error: { message: string } | null;
}> {
  const { data: rels, error } = await getRelationships();
  if (error) return { data: { nodes: [], edges: [] }, error };

  const relationships = rels ?? [];

  // 1. Endpoints distintos por tipo de entidad
  const endpointsByType = new Map<EntityType, Set<string>>();
  const addEndpoint = (type: EntityType, id: string) => {
    if (!endpointsByType.has(type)) endpointsByType.set(type, new Set());
    endpointsByType.get(type)!.add(id);
  };
  for (const r of relationships) {
    addEndpoint(r.source_entity_type, r.source_entity_id);
    addEndpoint(r.target_entity_type, r.target_entity_id);
  }

  // 2. Resolver etiquetas (una consulta por tipo presente)
  const labelMap: Record<string, string> = {};
  await Promise.all(
    Array.from(endpointsByType.keys()).map(async (type) => {
      const { data } = await getEntityOptions(type);
      for (const o of data) labelMap[`${type}:${o.id}`] = o.label;
    }),
  );

  // 3. Nodos (solo los que aparecen en alguna relación)
  const nodes: GraphNode[] = [];
  for (const [type, ids] of endpointsByType) {
    for (const id of ids) {
      const key = `${type}:${id}`;
      nodes.push({
        id: key,
        entityType: type,
        entityId: id,
        label: labelMap[key] ?? id,
      });
    }
  }

  // 4. Aristas
  const edges: GraphEdge[] = relationships.map((r) => ({
    id: r.id,
    source: `${r.source_entity_type}:${r.source_entity_id}`,
    target: `${r.target_entity_type}:${r.target_entity_id}`,
    label: r.relationship_type?.name ?? "",
    typeCode: r.relationship_type?.code ?? "",
  }));

  return { data: { nodes, edges }, error: null };
}
