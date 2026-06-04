import type { MapaPunto, MapaTipo } from "@/lib/queries/mapa";

// =============================================================================
// Lógica pura del mapa de /explorar (sin estado ni dependencias de React):
//   · filtrarPuntos        — aplica los filtros restrictivos + visibilidad por tipo.
//   · calcularFacetas      — opciones disponibles de cada dimensión (cascada).
//   · agregarPorTerritorio — agrupa por (territorio, tipo) para pintar marcadores.
//
// El filtrado es RESTRICTIVO: cada dimensión seleccionada acota las opciones de
// las demás. Las facetas de una dimensión D se calculan con los puntos que pasan
// TODAS las demás dimensiones (no la propia D), de modo que las opciones reflejan
// lo que queda tras el resto de la selección.
// =============================================================================

export const MAPA_TIPOS: MapaTipo[] = ["agentes", "proyectos"];

export const MAPA_TIPO_LABELS: Record<MapaTipo, string> = {
  agentes: "Agentes",
  proyectos: "Proyectos",
};

export const MAPA_TIPO_SINGULAR: Record<MapaTipo, string> = {
  agentes: "Agente",
  proyectos: "Proyecto",
};

/** Colores distintos por tipo (puntos del mapa + leyenda). */
export const MAPA_TIPO_COLORS: Record<MapaTipo, string> = {
  agentes: "#2563eb", // blue-600
  proyectos: "#ea580c", // orange-600
};

/** Dimensiones relacionales (excluye la visibilidad por tipo). */
export type DimensionRelacional =
  | "misionId"
  | "retoId"
  | "proyectoId"
  | "agenteId"
  | "ubicacionId";

export interface MapaFiltros {
  misionId: string | null;
  retoId: string | null;
  proyectoId: string | null;
  agenteId: string | null;
  ubicacionId: string | null;
  /** Tipos de entidad visibles (leyenda). */
  tipos: MapaTipo[];
}

export interface FacetaOpcion {
  value: string;
  label: string;
}

export interface MapaFacetas {
  misiones: FacetaOpcion[];
  retos: FacetaOpcion[];
  proyectos: FacetaOpcion[];
  agentes: FacetaOpcion[];
  ubicaciones: FacetaOpcion[];
}

/** Mapas id → nombre para etiquetar las opciones de los filtros. */
export interface MapaEtiquetas {
  misiones: Record<string, string>;
  retos: Record<string, string>;
  proyectos: Record<string, string>;
  agentes: Record<string, string>;
}

export interface MapaMarcador {
  key: string;
  ubicacionId: string;
  ubicacionNombre: string;
  latitud: number;
  longitud: number;
  tipo: MapaTipo;
  total: number;
  puntos: MapaPunto[];
}

export function filtrosVacios(): MapaFiltros {
  return {
    misionId: null,
    retoId: null,
    proyectoId: null,
    agenteId: null,
    ubicacionId: null,
    tipos: [...MAPA_TIPOS],
  };
}

/** ¿Hay algún filtro relacional activo? (útil para el botón de reset). */
export function hayFiltrosActivos(f: MapaFiltros): boolean {
  return Boolean(
    f.misionId ||
      f.retoId ||
      f.proyectoId ||
      f.agenteId ||
      f.ubicacionId ||
      f.tipos.length !== MAPA_TIPOS.length,
  );
}

/** ¿El punto cumple las dimensiones relacionales activas? `excepto` la omite. */
function pasaRelacional(
  p: MapaPunto,
  f: MapaFiltros,
  excepto?: DimensionRelacional,
): boolean {
  if (excepto !== "misionId" && f.misionId && !p.mision_ids.includes(f.misionId))
    return false;
  if (excepto !== "retoId" && f.retoId && !p.reto_ids.includes(f.retoId))
    return false;
  if (
    excepto !== "proyectoId" &&
    f.proyectoId &&
    !p.proyecto_ids.includes(f.proyectoId)
  )
    return false;
  if (excepto !== "agenteId" && f.agenteId && !p.agente_ids.includes(f.agenteId))
    return false;
  if (
    excepto !== "ubicacionId" &&
    f.ubicacionId &&
    p.ubicacion_id !== f.ubicacionId
  )
    return false;
  return true;
}

/** Puntos visibles: pasan todas las dimensiones relacionales y su tipo está activo. */
export function filtrarPuntos(
  puntos: MapaPunto[],
  f: MapaFiltros,
): MapaPunto[] {
  return puntos.filter((p) => f.tipos.includes(p.tipo) && pasaRelacional(p, f));
}

function ordenarPorLabel(opciones: FacetaOpcion[]): FacetaOpcion[] {
  return opciones.sort((a, b) => a.label.localeCompare(b.label, "es"));
}

/** Opciones disponibles de cada dimensión, de forma restrictiva (cascada). */
export function calcularFacetas(
  puntos: MapaPunto[],
  f: MapaFiltros,
  etiquetas: MapaEtiquetas,
): MapaFacetas {
  const acumular = (
    excepto: DimensionRelacional,
    extraer: (p: MapaPunto) => string[],
    nombre: (id: string) => string,
  ): FacetaOpcion[] => {
    const vistos = new Set<string>();
    const opciones: FacetaOpcion[] = [];
    for (const p of puntos) {
      if (!pasaRelacional(p, f, excepto)) continue;
      for (const id of extraer(p)) {
        if (!id || vistos.has(id)) continue;
        vistos.add(id);
        opciones.push({ value: id, label: nombre(id) });
      }
    }
    return ordenarPorLabel(opciones);
  };

  const nombreDe = (mapa: Record<string, string>) => (id: string) =>
    mapa[id] ?? "(sin nombre)";

  return {
    misiones: acumular("misionId", (p) => p.mision_ids, nombreDe(etiquetas.misiones)),
    retos: acumular("retoId", (p) => p.reto_ids, nombreDe(etiquetas.retos)),
    proyectos: acumular(
      "proyectoId",
      (p) => p.proyecto_ids,
      nombreDe(etiquetas.proyectos),
    ),
    agentes: acumular("agenteId", (p) => p.agente_ids, nombreDe(etiquetas.agentes)),
    ubicaciones: acumular(
      "ubicacionId",
      (p) => [p.ubicacion_id],
      // El nombre de la ubicación viaja en el propio dataset.
      () => "",
    ).map((o) => ({
      value: o.value,
      label:
        puntos.find((p) => p.ubicacion_id === o.value)?.ubicacion_nombre ??
        "(sin ubicación)",
    })),
  };
}

/** Agrupa los puntos filtrados por (ubicación, tipo) → un marcador por grupo. */
export function agregarPorUbicacion(puntos: MapaPunto[]): MapaMarcador[] {
  const grupos = new Map<string, MapaMarcador>();
  for (const p of puntos) {
    const key = `${p.ubicacion_id}|${p.tipo}`;
    const existente = grupos.get(key);
    if (existente) {
      existente.total += 1;
      existente.puntos.push(p);
    } else {
      grupos.set(key, {
        key,
        ubicacionId: p.ubicacion_id,
        ubicacionNombre: p.ubicacion_nombre,
        latitud: p.latitud,
        longitud: p.longitud,
        tipo: p.tipo,
        total: 1,
        puntos: [p],
      });
    }
  }
  return [...grupos.values()];
}
