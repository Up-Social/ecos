import { createClient } from "@/lib/supabase/client";
import type { RecomendacionConRelaciones, Hallazgo } from "@/lib/supabase/types";
import type { RecomendacionFormValues } from "@/lib/schemas/recomendacion";

const supabase = createClient();

const SELECT_WITH_RELATIONS = `
  *,
  hallazgos_rel:recomendaciones_hallazgos ( hallazgo:hallazgos ( id, titulo ) )
`;

function flatten(row: any): RecomendacionConRelaciones {
  return {
    ...row,
    hallazgos: (row.hallazgos_rel ?? [])
      .map((r: any) => r.hallazgo)
      .filter(Boolean) as Pick<Hallazgo, "id" | "titulo">[],
  };
}

export async function getRecomendaciones() {
  const { data, error } = await supabase
    .from("recomendaciones")
    .select(SELECT_WITH_RELATIONS)
    .order("created_at", { ascending: false });
  return { data: error ? null : (data ?? []).map(flatten), error };
}

function normalize(values: RecomendacionFormValues) {
  return {
    titulo: values.titulo,
    descripcion: values.descripcion,
    ambito: values.ambito && values.ambito.length > 0 ? values.ambito : null,
    destinatarios: values.destinatarios || null,
    alcance: values.alcance || null,
    estado: values.estado || null,
  };
}

/**
 * Sincroniza la N:M recomendaciones_hallazgos.
 */
export async function setRecomendacionHallazgos(
  recomendacionId: string,
  hallazgosIds: string[],
) {
  const { error: delErr } = await supabase
    .from("recomendaciones_hallazgos")
    .delete()
    .eq("recomendacion_id", recomendacionId);
  if (delErr) return { error: delErr };

  if (hallazgosIds.length === 0) return { error: null };

  const rows = hallazgosIds.map((hallazgo_id) => ({
    recomendacion_id: recomendacionId,
    hallazgo_id,
  }));
  const { error: insErr } = await supabase
    .from("recomendaciones_hallazgos")
    .insert(rows);
  return { error: insErr };
}

export async function createRecomendacion(values: RecomendacionFormValues) {
  const { hallazgos_ids = [], ...rest } = values;
  const { data, error } = await supabase
    .from("recomendaciones")
    .insert(normalize(rest as RecomendacionFormValues))
    .select()
    .single();
  if (error || !data) return { data: null, error };

  const { error: relErr } = await setRecomendacionHallazgos(data.id, hallazgos_ids);
  if (relErr) return { data: null, error: relErr };

  return { data, error: null };
}

export async function updateRecomendacion(
  id: string,
  values: RecomendacionFormValues,
) {
  const { hallazgos_ids = [], ...rest } = values;
  const { data, error } = await supabase
    .from("recomendaciones")
    .update(normalize(rest as RecomendacionFormValues))
    .eq("id", id)
    .select()
    .single();
  if (error || !data) return { data: null, error };

  const { error: relErr } = await setRecomendacionHallazgos(id, hallazgos_ids);
  if (relErr) return { data: null, error: relErr };

  return { data, error: null };
}

export async function deleteRecomendacion(id: string) {
  return supabase.from("recomendaciones").delete().eq("id", id);
}
