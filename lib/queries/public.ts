import type { SupabaseClient } from "@supabase/supabase-js";
import {
  TIPO_AGENTE,
  TIPO_AGENTE_LABELS,
  ESTADO_PROYECTO,
  ESTADO_PROYECTO_LABELS,
  ESTADO_EXPERIMENTACION,
  ESTADO_EXPERIMENTACION_LABELS,
  NIVEL_IMPACTO,
  NIVEL_IMPACTO_LABELS,
  toOptions,
} from "@/lib/enums";

// =============================================================================
// Datos del PORTAL PÚBLICO (Fase 08), leídos bajo RLS `public_read`:
// solo se devuelven filas con is_public = true. Se usan desde Server Components
// con el cliente servidor (anon para visitantes sin sesión).
// =============================================================================

export type PublicEntityType =
  | "misiones"
  | "retos"
  | "agentes"
  | "proyectos"
  | "innovaciones";

export interface PublicFilterOption {
  value: string;
  label: string;
}

interface PublicEntityConfig {
  type: PublicEntityType;
  /** Etiqueta plural (navegación). */
  label: string;
  /** Etiqueta singular (ficha). */
  singular: string;
  /** Columnas a leer (incluye is_public para el filtro). */
  select: string;
  /** Campo de filtro opcional + sus opciones (enum). */
  filter?: {
    field: string;
    label: string;
    options: PublicFilterOption[];
    labels: Record<string, string>;
  };
}

export const PUBLIC_ENTITY_CONFIG: Record<PublicEntityType, PublicEntityConfig> = {
  misiones: {
    type: "misiones",
    label: "Misiones",
    singular: "Misión",
    select: "id, nombre, descripcion, problema, is_public",
  },
  retos: {
    type: "retos",
    label: "Retos",
    singular: "Reto",
    select: "id, nombre, descripcion, is_public",
  },
  agentes: {
    type: "agentes",
    label: "Agentes",
    singular: "Agente",
    select:
      "id, nombre, descripcion, tipo_agente, municipio_sede, web, is_public",
    filter: {
      field: "tipo_agente",
      label: "Tipo de agente",
      options: toOptions(TIPO_AGENTE, TIPO_AGENTE_LABELS),
      labels: TIPO_AGENTE_LABELS,
    },
  },
  proyectos: {
    type: "proyectos",
    label: "Proyectos",
    singular: "Proyecto",
    select:
      "id, nombre, descripcion, estado, ccaa, financiador, is_public, agente_lider:agentes!proyectos_agente_lider_id_fkey(id, nombre, is_public)",
    filter: {
      field: "estado",
      label: "Estado",
      options: toOptions(ESTADO_PROYECTO, ESTADO_PROYECTO_LABELS),
      labels: ESTADO_PROYECTO_LABELS,
    },
  },
  innovaciones: {
    type: "innovaciones",
    label: "Innovaciones",
    singular: "Innovación",
    select:
      "id, nombre, descripcion, estado, nivel_impacto, is_public, proyecto:proyectos(id, nombre, is_public)",
    filter: {
      field: "estado",
      label: "Estado",
      options: toOptions(ESTADO_EXPERIMENTACION, ESTADO_EXPERIMENTACION_LABELS),
      labels: ESTADO_EXPERIMENTACION_LABELS,
    },
  },
};

export const PUBLIC_ENTITY_TYPES = Object.keys(
  PUBLIC_ENTITY_CONFIG,
) as PublicEntityType[];

export function isPublicEntityType(value: string): value is PublicEntityType {
  return value in PUBLIC_ENTITY_CONFIG;
}

export type PublicRow = Record<string, unknown>;

// -----------------------------------------------------------------------------
// Listado público de una entidad (solo is_public = true)
// -----------------------------------------------------------------------------
export async function listPublicEntities(
  supabase: SupabaseClient,
  type: PublicEntityType,
): Promise<{ data: PublicRow[]; error: { message: string } | null }> {
  const cfg = PUBLIC_ENTITY_CONFIG[type];
  const { data, error } = await supabase
    .from(type)
    .select(cfg.select)
    .eq("is_public", true)
    .order("nombre", { ascending: true })
    .returns<PublicRow[]>();
  if (error) return { data: [], error };
  return { data: data ?? [], error: null };
}

// -----------------------------------------------------------------------------
// Ficha pública de una entidad (solo si is_public = true)
// -----------------------------------------------------------------------------
export async function getPublicEntity(
  supabase: SupabaseClient,
  type: PublicEntityType,
  id: string,
): Promise<{ data: PublicRow | null; error: { message: string } | null }> {
  const cfg = PUBLIC_ENTITY_CONFIG[type];
  const { data, error } = await supabase
    .from(type)
    .select(cfg.select)
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle<PublicRow>();
  return { data: (data as PublicRow | null) ?? null, error };
}

// -----------------------------------------------------------------------------
// Conteo de entidades públicas por tipo (para la Home / hub)
// -----------------------------------------------------------------------------
export async function getPublicCounts(
  supabase: SupabaseClient,
): Promise<Record<PublicEntityType, number>> {
  const entries = await Promise.all(
    PUBLIC_ENTITY_TYPES.map(async (type) => {
      const { count } = await supabase
        .from(type)
        .select("id", { count: "exact", head: true })
        .eq("is_public", true);
      return [type, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<PublicEntityType, number>;
}

// -----------------------------------------------------------------------------
// Helpers de presentación
// -----------------------------------------------------------------------------

/** Convierte una fila en un ítem de lista uniforme para el explorador. */
export function toListItem(type: PublicEntityType, row: PublicRow) {
  const cfg = PUBLIC_ENTITY_CONFIG[type];
  const title = String(row.nombre ?? "(sin nombre)");
  const descripcion = row.descripcion ? String(row.descripcion) : undefined;
  let badge: string | undefined;
  if (cfg.filter) {
    const raw = row[cfg.filter.field];
    if (raw) badge = cfg.filter.labels[String(raw)] ?? String(raw);
  }
  return {
    id: String(row.id),
    title,
    subtitle: descripcion,
    badge,
    filterValue: cfg.filter ? (row[cfg.filter.field] as string | null) : null,
  };
}

/** Devuelve pares {label, value} a mostrar en la ficha de entidad. */
export function getEntityDetailFields(
  type: PublicEntityType,
  row: PublicRow,
): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = [];
  const push = (label: string, value: unknown) => {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      fields.push({ label, value: String(value) });
    }
  };

  switch (type) {
    case "misiones":
      push("Problema / justificación", row.problema);
      break;
    case "agentes":
      push(
        "Tipo de agente",
        row.tipo_agente
          ? TIPO_AGENTE_LABELS[row.tipo_agente as keyof typeof TIPO_AGENTE_LABELS]
          : null,
      );
      push("Municipio", row.municipio_sede);
      push("Web", row.web);
      break;
    case "proyectos": {
      push(
        "Estado",
        row.estado
          ? ESTADO_PROYECTO_LABELS[
              row.estado as keyof typeof ESTADO_PROYECTO_LABELS
            ]
          : null,
      );
      push("Comunidad autónoma", row.ccaa);
      push("Financiador", row.financiador);
      const lider = row.agente_lider as { nombre?: string } | null;
      push("Agente líder", lider?.nombre);
      break;
    }
    case "innovaciones": {
      push(
        "Estado",
        row.estado
          ? ESTADO_EXPERIMENTACION_LABELS[
              row.estado as keyof typeof ESTADO_EXPERIMENTACION_LABELS
            ]
          : null,
      );
      push(
        "Nivel de impacto",
        row.nivel_impacto
          ? NIVEL_IMPACTO_LABELS[
              row.nivel_impacto as keyof typeof NIVEL_IMPACTO_LABELS
            ]
          : null,
      );
      const proyecto = row.proyecto as { nombre?: string } | null;
      push("Proyecto", proyecto?.nombre);
      break;
    }
    default:
      break;
  }
  return fields;
}
