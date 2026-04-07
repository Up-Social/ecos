import { createClient } from "@/lib/supabase/client";

// -----------------------------------------------------------------------------
// Cobertura de retos: para cada reto, cuántas innovaciones lo están
// abordando. Usa la vista `v_cobertura_retos` (un row por reto/misión).
// Sin filtro de misión deduplicamos por reto_id.
// -----------------------------------------------------------------------------

const supabase = createClient();

export interface RetoCobertura {
  id: string;
  nombre: string;
  innovaciones_count: number;
}

export async function getRetosCobertura(
  misionId: string | null = null,
): Promise<RetoCobertura[]> {
  let query = supabase
    .from("v_cobertura_retos")
    .select("reto_id, reto_nombre, total_innovaciones, mision_id");

  if (misionId) query = query.eq("mision_id", misionId);

  const { data, error } = await query;
  if (error || !data) return [];

  if (misionId) {
    return (data as any[]).map((r) => ({
      id: r.reto_id as string,
      nombre: r.reto_nombre as string,
      innovaciones_count: (r.total_innovaciones as number) ?? 0,
    }));
  }

  // Sin filtro: deduplicar retos. El total_innovaciones de la vista es
  // por reto (no por reto+misión), así que el primer row vale.
  const map = new Map<string, RetoCobertura>();
  for (const r of data as any[]) {
    const id = r.reto_id as string;
    if (!map.has(id)) {
      map.set(id, {
        id,
        nombre: r.reto_nombre as string,
        innovaciones_count: (r.total_innovaciones as number) ?? 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );
}
