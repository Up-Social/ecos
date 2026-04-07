import { createClient } from "@/lib/supabase/client";
import type { RetoConRelaciones, Mision } from "@/lib/supabase/types";
import type { RetoFormValues } from "@/lib/schemas/reto";

const supabase = createClient();

const SELECT_WITH_RELATIONS = `
  *,
  misiones_rel:retos_misiones ( mision:misiones ( id, nombre ) )
`;

function flatten(row: any): RetoConRelaciones {
  return {
    ...row,
    misiones: (row.misiones_rel ?? [])
      .map((r: any) => r.mision)
      .filter(Boolean) as Pick<Mision, "id" | "nombre">[],
  };
}

export async function getRetos(opts: { misionId?: string | null } = {}) {
  // Filtro por misión vía la tabla intermedia retos_misiones.
  let allowedIds: string[] | null = null;
  if (opts.misionId) {
    const { data } = await supabase
      .from("retos_misiones")
      .select("reto_id")
      .eq("mision_id", opts.misionId);
    allowedIds = (data ?? []).map((r: any) => r.reto_id as string);
    if (allowedIds.length === 0) {
      return { data: [] as RetoConRelaciones[], error: null };
    }
  }

  const query = supabase
    .from("retos")
    .select(SELECT_WITH_RELATIONS)
    .order("created_at", { ascending: false });

  if (allowedIds) query.in("id", allowedIds);

  const { data, error } = await query;
  return { data: error ? null : (data ?? []).map(flatten), error };
}

/** Versión ligera para selects: id y nombre. */
export async function getRetosLite() {
  return supabase.from("retos").select("id, nombre").order("nombre");
}

function normalize(values: RetoFormValues) {
  return {
    nombre: values.nombre,
    descripcion: values.descripcion || null,
  };
}

/**
 * Sincroniza la N:M retos_misiones: borra previas e inserta nuevas.
 */
export async function setRetoMisiones(retoId: string, misionesIds: string[]) {
  const { error: delErr } = await supabase
    .from("retos_misiones")
    .delete()
    .eq("reto_id", retoId);
  if (delErr) return { error: delErr };

  if (misionesIds.length === 0) return { error: null };

  const rows = misionesIds.map((mision_id) => ({
    reto_id: retoId,
    mision_id,
  }));
  const { error: insErr } = await supabase.from("retos_misiones").insert(rows);
  return { error: insErr };
}

export async function createReto(values: RetoFormValues) {
  const { misiones_ids = [], ...rest } = values;
  const { data, error } = await supabase
    .from("retos")
    .insert(normalize(rest as RetoFormValues))
    .select()
    .single();
  if (error || !data) return { data: null, error };

  const { error: relErr } = await setRetoMisiones(data.id, misiones_ids);
  if (relErr) return { data: null, error: relErr };

  return { data, error: null };
}

export async function updateReto(id: string, values: RetoFormValues) {
  const { misiones_ids = [], ...rest } = values;
  const { data, error } = await supabase
    .from("retos")
    .update(normalize(rest as RetoFormValues))
    .eq("id", id)
    .select()
    .single();
  if (error || !data) return { data: null, error };

  const { error: relErr } = await setRetoMisiones(id, misiones_ids);
  if (relErr) return { data: null, error: relErr };

  return { data, error: null };
}

export async function deleteReto(id: string) {
  return supabase.from("retos").delete().eq("id", id);
}

export type { RetoConRelaciones };
