import type { SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
// Dataset del mapa público de /explorar.
//
// Llama a la RPC `mapa_dataset()` (SECURITY DEFINER): devuelve un punto por
// AGENTE y por PROYECTO público con territorio geolocalizado, ya denormalizado
// con los ids de relaciones para el filtrado restrictivo (que ocurre en cliente).
// Solo expone entidades is_public; es accesible para anónimos.
// =============================================================================

export type MapaTipo = "agentes" | "proyectos";

export interface MapaPunto {
  tipo: MapaTipo;
  entidad_id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  /** Ubicación: territorio (uuid), 'mun:<municipio>' o 'ccaa:<ccaa>'. */
  ubicacion_id: string;
  ubicacion_nombre: string;
  mision_ids: string[];
  reto_ids: string[];
  proyecto_ids: string[];
  agente_ids: string[];
}

export async function getMapaDataset(
  supabase: SupabaseClient,
): Promise<{ data: MapaPunto[]; error: { message: string } | null }> {
  const { data, error } = await supabase.rpc("mapa_dataset");
  if (error) return { data: [], error };
  return { data: (data ?? []) as MapaPunto[], error: null };
}

// -----------------------------------------------------------------------------
// Etiquetas id → nombre para los filtros del mapa (misiones, retos, proyectos,
// agentes). Bajo RLS `public_read` solo devuelve las entidades públicas, que son
// justo las que pueden aparecer en el dataset del mapa.
// -----------------------------------------------------------------------------
export interface MapaEtiquetasData {
  misiones: Record<string, string>;
  retos: Record<string, string>;
  proyectos: Record<string, string>;
  agentes: Record<string, string>;
}

async function mapaNombres(
  supabase: SupabaseClient,
  tabla: "misiones" | "retos" | "proyectos" | "agentes",
): Promise<Record<string, string>> {
  const { data } = await supabase
    .from(tabla)
    .select("id, nombre")
    .eq("is_public", true);
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as { id: string; nombre: string | null }[]) {
    out[row.id] = row.nombre ?? "(sin nombre)";
  }
  return out;
}

export async function getMapaEtiquetas(
  supabase: SupabaseClient,
): Promise<MapaEtiquetasData> {
  const [misiones, retos, proyectos, agentes] = await Promise.all([
    mapaNombres(supabase, "misiones"),
    mapaNombres(supabase, "retos"),
    mapaNombres(supabase, "proyectos"),
    mapaNombres(supabase, "agentes"),
  ]);
  return { misiones, retos, proyectos, agentes };
}
