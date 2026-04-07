import { createClient } from "@/lib/supabase/client";

// -----------------------------------------------------------------------------
// KPIs estratégicos del dashboard.
//
// Con misión seleccionada → vista `v_kpis_mision` (pre-agregada en SQL).
// Sin misión             → 6 counts globales en paralelo (no podemos sumar
//                          las filas de la vista porque las entidades pueden
//                          aparecer en varias misiones).
// -----------------------------------------------------------------------------

const supabase = createClient();

export interface KPIs {
  agentes: number;
  proyectos: number;
  innovaciones: number;
  retos: number;
  hallazgos: number;
  recomendaciones: number;
}

const ZERO_KPIS: KPIs = {
  agentes: 0,
  proyectos: 0,
  innovaciones: 0,
  retos: 0,
  hallazgos: 0,
  recomendaciones: 0,
};

async function countAll(table: string): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function getKPIs(misionId: string | null = null): Promise<KPIs> {
  // Con filtro de misión: una sola query a la vista pre-agregada
  if (misionId) {
    const { data, error } = await supabase
      .from("v_kpis_mision")
      .select(
        "total_agentes, total_proyectos, total_innovaciones, total_retos, total_hallazgos, total_recomendaciones",
      )
      .eq("mision_id", misionId)
      .maybeSingle();

    if (error || !data) return ZERO_KPIS;
    const row = data as any;
    return {
      agentes: row.total_agentes ?? 0,
      proyectos: row.total_proyectos ?? 0,
      innovaciones: row.total_innovaciones ?? 0,
      retos: row.total_retos ?? 0,
      hallazgos: row.total_hallazgos ?? 0,
      recomendaciones: row.total_recomendaciones ?? 0,
    };
  }

  // Sin filtro: counts globales en paralelo
  const [agentes, proyectos, innovaciones, retos, hallazgos, recomendaciones] =
    await Promise.all([
      countAll("agentes"),
      countAll("proyectos"),
      countAll("innovaciones"),
      countAll("retos"),
      countAll("hallazgos"),
      countAll("recomendaciones"),
    ]);
  return { agentes, proyectos, innovaciones, retos, hallazgos, recomendaciones };
}
