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
