import { createClient } from "@/lib/supabase/client";

// -----------------------------------------------------------------------------
// Detección de vacíos del sistema:
//
//   • Retos huérfanos       — vista `v_retos_sin_innovacion`
//   • Misiones con baja     — vista `v_kpis_mision` (filtra total_innovaciones)
//     actividad
// -----------------------------------------------------------------------------

const supabase = createClient();

const UMBRAL_BAJA_ACTIVIDAD = 3;

export interface RetoHuerfano {
  id: string;
  nombre: string;
}

export interface MisionBajaActividad {
  id: string;
  nombre: string;
  innovaciones_count: number;
}

export interface SystemGaps {
  retosHuerfanos: RetoHuerfano[];
  misionesBajaActividad: MisionBajaActividad[];
  umbral: number;
}

// -----------------------------------------------------------------------------
// Retos huérfanos (vista v_retos_sin_innovacion)
// -----------------------------------------------------------------------------

async function getRetosHuerfanos(
  misionId: string | null,
): Promise<RetoHuerfano[]> {
  let query = supabase
    .from("v_retos_sin_innovacion")
    .select("reto_id, reto_nombre, mision_id");
  if (misionId) query = query.eq("mision_id", misionId);

  const { data, error } = await query;
  if (error || !data) return [];

  // Deduplicar por reto_id (un reto huérfano puede aparecer en varias misiones)
  const map = new Map<string, RetoHuerfano>();
  for (const r of data as any[]) {
    const id = r.reto_id as string;
    if (!map.has(id)) {
      map.set(id, { id, nombre: r.reto_nombre as string });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );
}

// -----------------------------------------------------------------------------
// Misiones con baja actividad (vista v_kpis_mision)
// -----------------------------------------------------------------------------

async function getMisionesBajaActividad(
  misionId: string | null,
): Promise<MisionBajaActividad[]> {
  let query = supabase
    .from("v_kpis_mision")
    .select("mision_id, mision_nombre, total_innovaciones")
    .lt("total_innovaciones", UMBRAL_BAJA_ACTIVIDAD)
    .order("total_innovaciones", { ascending: true });
  if (misionId) query = query.eq("mision_id", misionId);

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as any[]).map((r) => ({
    id: r.mision_id as string,
    nombre: r.mision_nombre as string,
    innovaciones_count: (r.total_innovaciones as number) ?? 0,
  }));
}

// -----------------------------------------------------------------------------
// API pública
// -----------------------------------------------------------------------------

export async function getSystemGaps(
  misionId: string | null = null,
): Promise<SystemGaps> {
  const [retosHuerfanos, misionesBajaActividad] = await Promise.all([
    getRetosHuerfanos(misionId),
    getMisionesBajaActividad(misionId),
  ]);
  return {
    retosHuerfanos,
    misionesBajaActividad,
    umbral: UMBRAL_BAJA_ACTIVIDAD,
  };
}
