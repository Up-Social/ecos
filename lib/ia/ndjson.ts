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

/** Interpreta una línea; null si está vacía, incompleta o no es resumen/insight. */
export function clasificarLineaNdjson(linea: string): LineaNdjson | null {
  const recortada = linea.trim();
  if (!recortada) return null;
  try {
    const obj: unknown = JSON.parse(recortada);
    if (!obj || typeof obj !== "object") return null;
    const registro = obj as Record<string, unknown>;
    if (typeof registro.resumen === "string") {
      return { tipo: "resumen", texto: registro.resumen };
    }
    if (typeof registro.tipo === "string") {
      return { tipo: "insight", insight: registro as unknown as Insight };
    }
    return null;
  } catch {
    return null;
  }
}
