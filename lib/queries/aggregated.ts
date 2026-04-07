import { createClient } from "@/lib/supabase/client";
import type { NivelEvidencia } from "@/lib/supabase/types";

// -----------------------------------------------------------------------------
// Hallazgos agregados por reto. Usa la vista `v_hallazgos_reto` que ya
// resuelve la cadena hallazgo → innovación → reto → misión.
// El componente además quiere mostrar `validado` e `innovacion_nombre`,
// que la vista no incluye, así que los traemos en una segunda query y los
// mergeamos por hallazgo_id.
// -----------------------------------------------------------------------------

const supabase = createClient();

export interface HallazgoLite {
  id: string;
  titulo: string;
  nivel_evidencia: NivelEvidencia | null;
  validado: boolean;
  innovacion_nombre: string | null;
}

export interface RetoConHallazgos {
  id: string;
  nombre: string;
  hallazgos: HallazgoLite[];
}

export async function getHallazgosPorReto(
  misionId: string | null = null,
): Promise<RetoConHallazgos[]> {
  // 1. Filas (reto, hallazgo) desde la vista
  let query = supabase
    .from("v_hallazgos_reto")
    .select("mision_id, reto_id, reto_nombre, hallazgo_id, titulo, nivel_evidencia");
  if (misionId) query = query.eq("mision_id", misionId);

  const { data: rows, error } = await query;
  if (error || !rows) return [];

  // 2. Para los hallazgos detectados, traer validado + innovacion_nombre
  const hallazgoIds = Array.from(
    new Set((rows as any[]).map((r) => r.hallazgo_id as string)),
  );

  let extraMap = new Map<
    string,
    { validado: boolean; innovacion_nombre: string | null }
  >();

  if (hallazgoIds.length > 0) {
    const { data: extras } = await supabase
      .from("hallazgos")
      .select("id, validado, innovacion:innovaciones ( nombre )")
      .in("id", hallazgoIds);
    for (const h of (extras ?? []) as any[]) {
      extraMap.set(h.id as string, {
        validado: !!h.validado,
        innovacion_nombre: h.innovacion?.nombre ?? null,
      });
    }
  }

  // 3. Agrupar por reto, deduplicando hallazgos repetidos
  const byReto = new Map<string, RetoConHallazgos>();
  const seenHallazgo = new Map<string, Set<string>>(); // retoId -> Set<hallazgoId>

  for (const r of rows as any[]) {
    const retoId = r.reto_id as string;
    if (!byReto.has(retoId)) {
      byReto.set(retoId, {
        id: retoId,
        nombre: r.reto_nombre as string,
        hallazgos: [],
      });
      seenHallazgo.set(retoId, new Set());
    }
    const seen = seenHallazgo.get(retoId)!;
    const hId = r.hallazgo_id as string;
    if (seen.has(hId)) continue;
    seen.add(hId);

    const extra = extraMap.get(hId);
    byReto.get(retoId)!.hallazgos.push({
      id: hId,
      titulo: r.titulo as string,
      nivel_evidencia: (r.nivel_evidencia as NivelEvidencia | null) ?? null,
      validado: extra?.validado ?? false,
      innovacion_nombre: extra?.innovacion_nombre ?? null,
    });
  }

  return Array.from(byReto.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );
}
