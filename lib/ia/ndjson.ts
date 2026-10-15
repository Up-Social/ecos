// -----------------------------------------------------------------------------
// Salida NDJSON de /api/insights: una línea = un objeto (resumen o insight).
// El texto llega en deltas, así que una línea puede partirse entre chunks.
// -----------------------------------------------------------------------------

export interface Insight {
  tipo:
    | "vacio"
    | "oportunidad"
    | "concentracion"
    | "madurez"
    | "cuello_botella"
    | "fortaleza";
  titulo: string;
  descripcion: string;
  prioridad: "alta" | "media" | "baja";
  evidencia: string;
}

export type LineaNdjson =
  | { tipo: "resumen"; texto: string }
  | { tipo: "insight"; insight: Insight };

/** Separa las líneas completas del buffer; `resto` es la línea aún incompleta. */
export function separarLineasNdjson(buffer: string): { lineas: string[]; resto: string } {
  const lineas = buffer.split("\n");
  const resto = lineas.pop() ?? "";
  return { lineas, resto };
}

/**
 * Interpreta una línea. Devuelve [] si está vacía, incompleta o no es
 * resumen/insight. El modelo a veces junta el resumen y el primer insight en un
 * mismo objeto ({"resumen":…, "tipo":…}): en ese caso devuelve los dos.
 */
export function interpretarLineaNdjson(linea: string): LineaNdjson[] {
  const recortada = linea.trim();
  if (!recortada) return [];
  let obj: unknown;
  try {
    obj = JSON.parse(recortada);
  } catch {
    return [];
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];

  const { resumen, ...resto } = obj as Record<string, unknown>;
  const resultado: LineaNdjson[] = [];
  if (typeof resumen === "string") {
    resultado.push({ tipo: "resumen", texto: resumen });
  }
  if (typeof resto.tipo === "string") {
    resultado.push({ tipo: "insight", insight: resto as unknown as Insight });
  }
  return resultado;
}
