import { createClient } from "@/lib/supabase/client";
import type {
  InnovacionConProyecto,
  InnovacionConRelaciones,
  Reto,
} from "@/lib/supabase/types";
import type { InnovacionFormValues } from "@/lib/schemas/innovacion";

// -----------------------------------------------------------------------------
// CRUD de innovaciones con relaciones N:M a retos.
// -----------------------------------------------------------------------------

const supabase = createClient();

const SELECT_WITH_RELATIONS = `
  *,
  proyecto:proyectos ( id, nombre ),
  retos_rel:innovaciones_retos ( reto:retos ( id, nombre ) )
`;

/** Aplana retos_rel a un array plano de retos. */
function flatten(row: any): InnovacionConRelaciones {
  return {
    ...row,
    proyecto: row.proyecto ?? null,
    retos: (row.retos_rel ?? [])
      .map((r: any) => r.reto)
      .filter(Boolean) as Pick<Reto, "id" | "nombre">[],
  };
}

export async function getInnovaciones(
  opts: { misionId?: string | null } = {},
) {
  // Filtro por misión vía la vista `innovaciones_misiones`.
  let allowedIds: string[] | null = null;
  if (opts.misionId) {
    const { data } = await supabase
      .from("innovaciones_misiones")
      .select("innovacion_id")
      .eq("mision_id", opts.misionId);
    allowedIds = (data ?? []).map((r: any) => r.innovacion_id as string);
    if (allowedIds.length === 0) {
      return { data: [] as InnovacionConRelaciones[], error: null };
    }
  }

  const query = supabase
    .from("innovaciones")
    .select(SELECT_WITH_RELATIONS)
    .order("created_at", { ascending: false });

  if (allowedIds) query.in("id", allowedIds);

  const { data, error } = await query;
  return {
    data: error ? null : (data ?? []).map(flatten),
    error,
  };
}

/** Versión ligera para selects: id y nombre. */
export async function getInnovacionesLite() {
  return supabase.from("innovaciones").select("id, nombre").order("nombre");
}

export async function getInnovacion(id: string) {
  const { data, error } = await supabase
    .from("innovaciones")
    .select(SELECT_WITH_RELATIONS)
    .eq("id", id)
    .single();
  return {
    data: error || !data ? null : flatten(data),
    error,
  };
}

function normalize(values: InnovacionFormValues) {
  return {
    nombre: values.nombre,
    descripcion: values.descripcion || null,
    proyecto_id: values.proyecto_id,
    estado: values.estado || null,
    nivel_impacto: values.nivel_impacto || null,
    n_participantes: values.n_participantes || null,
  };
}

/**
 * Sincroniza la N:M innovaciones_retos: borra las relaciones previas y
 * crea las nuevas. Pensado para usarse tras create/update de la innovación.
 */
export async function setInnovacionRetos(
  innovacionId: string,
  retosIds: string[],
) {
  const { error: delErr } = await supabase
    .from("innovaciones_retos")
    .delete()
    .eq("innovacion_id", innovacionId);
  if (delErr) return { error: delErr };

  if (retosIds.length === 0) return { error: null };

  const rows = retosIds.map((reto_id) => ({
    innovacion_id: innovacionId,
    reto_id,
  }));
  const { error: insErr } = await supabase
    .from("innovaciones_retos")
    .insert(rows);
  return { error: insErr };
}

export async function createInnovacion(values: InnovacionFormValues) {
  const { retos_ids = [], ...rest } = values;
  const { data, error } = await supabase
    .from("innovaciones")
    .insert(normalize(rest as InnovacionFormValues))
    .select()
    .single();
  if (error || !data) return { data: null, error };

  const { error: relErr } = await setInnovacionRetos(data.id, retos_ids);
  if (relErr) return { data: null, error: relErr };

  return { data, error: null };
}

export async function updateInnovacion(
  id: string,
  values: InnovacionFormValues,
) {
  const { retos_ids = [], ...rest } = values;
  const { data, error } = await supabase
    .from("innovaciones")
    .update(normalize(rest as InnovacionFormValues))
    .eq("id", id)
    .select()
    .single();
  if (error || !data) return { data: null, error };

  const { error: relErr } = await setInnovacionRetos(id, retos_ids);
  if (relErr) return { data: null, error: relErr };

  return { data, error: null };
}

export async function deleteInnovacion(id: string) {
  // innovaciones_retos cascadea por la FK ON DELETE CASCADE
  return supabase.from("innovaciones").delete().eq("id", id);
}

export type { InnovacionConProyecto, InnovacionConRelaciones };
