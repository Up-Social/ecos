import { createClient } from "@/lib/supabase/client";
import type { EstadoInnovacion, NivelImpacto } from "@/lib/supabase/types";

// -----------------------------------------------------------------------------
// Cartera de innovación.
//
// Con misión → vista `v_cartera_innovacion` agregada por (estado, nivel_impacto)
// Sin misión → query directa a innovaciones (una fila por innovación) para
//              evitar doble conteo entre misiones.
// -----------------------------------------------------------------------------

const supabase = createClient();

export interface InnovacionStatRow {
  estado: EstadoInnovacion | null;
  nivel_impacto: NivelImpacto | null;
}

export async function getInnovacionesPortfolio(
  misionId: string | null = null,
): Promise<InnovacionStatRow[]> {
  if (misionId) {
    // La vista ya viene agregada (estado, nivel_impacto, total). La
    // re-expandimos a "filas virtuales" para conservar la forma que espera
    // el componente del gráfico.
    const { data, error } = await supabase
      .from("v_cartera_innovacion")
      .select("estado, nivel_impacto, total")
      .eq("mision_id", misionId);
    if (error || !data) return [];

    const rows: InnovacionStatRow[] = [];
    for (const r of data as any[]) {
      const total = (r.total as number) ?? 0;
      for (let i = 0; i < total; i++) {
        rows.push({
          estado: r.estado ?? null,
          nivel_impacto: r.nivel_impacto ?? null,
        });
      }
    }
    return rows;
  }

  const { data, error } = await supabase
    .from("innovaciones")
    .select("estado, nivel_impacto");
  if (error || !data) return [];
  return data as InnovacionStatRow[];
}
