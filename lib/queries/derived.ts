import { createClient } from "@/lib/supabase/client";

// -----------------------------------------------------------------------------
// Queries a vistas derivadas (lógica ECOS de propagación de relaciones).
// -----------------------------------------------------------------------------

const supabase = createClient();

export interface DerivedItem {
  id: string;
  nombre: string;
}

/**
 * Misiones derivadas para un proyecto, vía la cadena
 *   proyecto → innovaciones → retos → misiones
 * Usa la vista `proyectos_misiones`.
 */
export async function getMisionesDerivadasDeProyecto(
  proyectoId: string,
): Promise<DerivedItem[]> {
  const { data, error } = await supabase
    .from("proyectos_misiones")
    .select("mision_id, mision_nombre")
    .eq("proyecto_id", proyectoId);
  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.mision_id, nombre: r.mision_nombre }));
}

/**
 * Retos derivados para un proyecto, vía la cadena
 *   proyecto → innovaciones → retos
 * Usa la vista `proyectos_retos`.
 */
export async function getRetosDerivadosDeProyecto(
  proyectoId: string,
): Promise<DerivedItem[]> {
  const { data, error } = await supabase
    .from("proyectos_retos")
    .select("reto_id, reto_nombre")
    .eq("proyecto_id", proyectoId);
  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.reto_id, nombre: r.reto_nombre }));
}

/**
 * Misiones derivadas para una innovación, vía la cadena
 *   innovación → retos → misiones
 * Usa la vista `innovaciones_misiones`.
 */
export async function getMisionesDerivadasDeInnovacion(
  innovacionId: string,
): Promise<DerivedItem[]> {
  const { data, error } = await supabase
    .from("innovaciones_misiones")
    .select("mision_id, mision_nombre")
    .eq("innovacion_id", innovacionId);
  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.mision_id, nombre: r.mision_nombre }));
}

/** Helper: carga las dos relaciones derivadas de un proyecto en paralelo. */
export async function getProyectoRelacionesDerivadas(proyectoId: string) {
  const [misiones, retos] = await Promise.all([
    getMisionesDerivadasDeProyecto(proyectoId),
    getRetosDerivadosDeProyecto(proyectoId),
  ]);
  return { misiones, retos };
}
