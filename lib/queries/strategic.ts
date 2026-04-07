import { createClient } from "@/lib/supabase/client";
import type {
  Recomendacion,
  AlcanceRecomendacion,
  EstadoRecomendacion,
} from "@/lib/supabase/types";

// -----------------------------------------------------------------------------
// Recomendaciones estratégicas.
//
// Con misión → vista `v_recomendaciones_mision` para el filtrado por misión,
//              luego segunda query a `recomendaciones` para enriquecer
//              (descripcion, ambito, destinatarios, hallazgos_count).
// Sin misión → query directa con nested select de count.
// -----------------------------------------------------------------------------

const supabase = createClient();

export interface RecomendacionLite {
  id: string;
  titulo: string;
  descripcion: string;
  ambito: string[] | null;
  destinatarios: string | null;
  alcance: AlcanceRecomendacion | null;
  estado: EstadoRecomendacion | null;
  hallazgos_count: number;
}

const SELECT_FULL = `
  id, titulo, descripcion, ambito, destinatarios, alcance, estado,
  recomendaciones_hallazgos(count)
`;

function flatten(row: any): RecomendacionLite {
  return {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    ambito: row.ambito ?? null,
    destinatarios: row.destinatarios ?? null,
    alcance: row.alcance ?? null,
    estado: row.estado ?? null,
    hallazgos_count:
      Array.isArray(row.recomendaciones_hallazgos) &&
      row.recomendaciones_hallazgos.length > 0
        ? (row.recomendaciones_hallazgos[0].count as number)
        : 0,
  };
}

export async function getRecomendacionesEstrategicas(
  misionId: string | null = null,
): Promise<RecomendacionLite[]> {
  // Sin filtro: todas las recomendaciones con count anidado
  if (!misionId) {
    const { data, error } = await supabase
      .from("recomendaciones")
      .select(SELECT_FULL)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as any[]).map(flatten);
  }

  // Con filtro: ids de la vista, luego enriquecer
  const { data: ids } = await supabase
    .from("v_recomendaciones_mision")
    .select("id")
    .eq("mision_id", misionId);
  const recIds = Array.from(
    new Set(((ids ?? []) as any[]).map((r) => r.id as string)),
  );
  if (recIds.length === 0) return [];

  const { data, error } = await supabase
    .from("recomendaciones")
    .select(SELECT_FULL)
    .in("id", recIds)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as any[]).map(flatten);
}

export type { Recomendacion };
