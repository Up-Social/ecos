import { createClient } from "@/lib/supabase/client";

// =============================================================================
// API consolidada del dashboard.
// Cada función mapea 1:1 con una vista analítica creada en la migración
// 20260407221501_analytics_views.sql.
// =============================================================================

const supabase = createClient();

// -----------------------------------------------------------------------------
// 0) Misiones (selector)
// -----------------------------------------------------------------------------
export async function getMisiones() {
  const { data, error } = await supabase
    .from("misiones")
    .select("id, nombre")
    .order("nombre");
  if (error) throw error;
  return data;
}

// -----------------------------------------------------------------------------
// 1) KPIs estratégicos
// -----------------------------------------------------------------------------
export interface DashboardKPIs {
  mision_id: string;
  mision_nombre: string;
  total_retos: number;
  total_innovaciones: number;
  total_proyectos: number;
  total_agentes: number;
  total_hallazgos: number;
  total_recomendaciones: number;
}

export async function getKPIs(misionId: string): Promise<DashboardKPIs> {
  const { data, error } = await supabase
    .from("v_kpis_mision")
    .select("*")
    .eq("mision_id", misionId)
    .single();
  if (error) throw error;
  return data as DashboardKPIs;
}

// -----------------------------------------------------------------------------
// 2) Cartera de innovación (estado × nivel_impacto)
// -----------------------------------------------------------------------------
export interface CarteraRow {
  estado: string | null;
  nivel_impacto: string | null;
  total: number;
}

export async function getCartera(misionId: string): Promise<CarteraRow[]> {
  const { data, error } = await supabase
    .from("v_cartera_innovacion")
    .select("estado, nivel_impacto, total")
    .eq("mision_id", misionId);
  if (error) throw error;
  return (data as CarteraRow[]) ?? [];
}

// -----------------------------------------------------------------------------
// 3) Cobertura de retos
// -----------------------------------------------------------------------------
export interface CoberturaRow {
  reto_id: string;
  reto_nombre: string;
  total_innovaciones: number;
}

export async function getCoberturaRetos(
  misionId: string,
): Promise<CoberturaRow[]> {
  const { data, error } = await supabase
    .from("v_cobertura_retos")
    .select("reto_id, reto_nombre, total_innovaciones")
    .eq("mision_id", misionId)
    .order("total_innovaciones", { ascending: false });
  if (error) throw error;
  return (data as CoberturaRow[]) ?? [];
}

// -----------------------------------------------------------------------------
// 4) Vacíos del sistema (retos sin innovación)
// -----------------------------------------------------------------------------
export interface RetoVacio {
  reto_id: string;
  reto_nombre: string;
  mision_id: string;
  total_innovaciones: number;
}

export async function getRetosSinInnovacion(
  misionId: string,
): Promise<RetoVacio[]> {
  const { data, error } = await supabase
    .from("v_retos_sin_innovacion")
    .select("*")
    .eq("mision_id", misionId);
  if (error) throw error;
  return (data as RetoVacio[]) ?? [];
}

// -----------------------------------------------------------------------------
// 5) Hallazgos por reto
// -----------------------------------------------------------------------------
export interface HallazgoRow {
  reto_nombre: string;
  titulo: string;
  nivel_evidencia: string | null;
}

export async function getHallazgos(misionId: string): Promise<HallazgoRow[]> {
  const { data, error } = await supabase
    .from("v_hallazgos_reto")
    .select("reto_nombre, titulo, nivel_evidencia")
    .eq("mision_id", misionId);
  if (error) throw error;
  return (data as HallazgoRow[]) ?? [];
}

/** Helper: agrupa hallazgos por reto. */
export function groupHallazgos(
  data: HallazgoRow[],
): Record<string, HallazgoRow[]> {
  return data.reduce<Record<string, HallazgoRow[]>>((acc, item) => {
    if (!acc[item.reto_nombre]) acc[item.reto_nombre] = [];
    acc[item.reto_nombre].push(item);
    return acc;
  }, {});
}

// -----------------------------------------------------------------------------
// 6) Recomendaciones
// -----------------------------------------------------------------------------
export interface RecomendacionRow {
  id: string;
  titulo: string;
  estado: string | null;
  alcance: string | null;
}

export async function getRecomendaciones(
  misionId: string,
): Promise<RecomendacionRow[]> {
  const { data, error } = await supabase
    .from("v_recomendaciones_mision")
    .select("id, titulo, estado, alcance")
    .eq("mision_id", misionId);
  if (error) throw error;
  return (data as RecomendacionRow[]) ?? [];
}

// -----------------------------------------------------------------------------
// 7) Densidad de agentes
// -----------------------------------------------------------------------------
export interface AgenteRow {
  nombre: string;
  total_proyectos: number;
}

export async function getAgentes(misionId: string): Promise<AgenteRow[]> {
  const { data, error } = await supabase
    .from("v_agentes_mision")
    .select("nombre, total_proyectos")
    .eq("mision_id", misionId)
    .order("total_proyectos", { ascending: false });
  if (error) throw error;
  return (data as AgenteRow[]) ?? [];
}

// -----------------------------------------------------------------------------
// 8) Nivel de evidencia
// -----------------------------------------------------------------------------
export interface EvidenciaRow {
  nivel_evidencia: string | null;
  total: number;
}

export async function getEvidencia(misionId: string): Promise<EvidenciaRow[]> {
  const { data, error } = await supabase
    .from("v_nivel_evidencia_mision")
    .select("nivel_evidencia, total")
    .eq("mision_id", misionId);
  if (error) throw error;
  return (data as EvidenciaRow[]) ?? [];
}

// -----------------------------------------------------------------------------
// 9) Pipeline de madurez
// -----------------------------------------------------------------------------
export interface PipelineRow {
  estado: string | null;
  total: number;
}

export async function getPipeline(misionId: string): Promise<PipelineRow[]> {
  const { data, error } = await supabase
    .from("v_pipeline_madurez")
    .select("estado, total")
    .eq("mision_id", misionId);
  if (error) throw error;
  return (data as PipelineRow[]) ?? [];
}

// -----------------------------------------------------------------------------
// Snapshot agregado
// -----------------------------------------------------------------------------
export interface DashboardSnapshot {
  kpis: DashboardKPIs;
  cartera: CarteraRow[];
  cobertura: CoberturaRow[];
  vacios: RetoVacio[];
  hallazgos: HallazgoRow[];
  recomendaciones: RecomendacionRow[];
  agentes: AgenteRow[];
  evidencia: EvidenciaRow[];
  pipeline: PipelineRow[];
}

export async function getDashboardSnapshot(
  misionId: string,
): Promise<DashboardSnapshot> {
  const [
    kpis,
    cartera,
    cobertura,
    vacios,
    hallazgos,
    recomendaciones,
    agentes,
    evidencia,
    pipeline,
  ] = await Promise.all([
    getKPIs(misionId),
    getCartera(misionId),
    getCoberturaRetos(misionId),
    getRetosSinInnovacion(misionId),
    getHallazgos(misionId),
    getRecomendaciones(misionId),
    getAgentes(misionId),
    getEvidencia(misionId),
    getPipeline(misionId),
  ]);
  return {
    kpis,
    cartera,
    cobertura,
    vacios,
    hallazgos,
    recomendaciones,
    agentes,
    evidencia,
    pipeline,
  };
}
