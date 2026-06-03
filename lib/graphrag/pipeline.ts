import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/embeddings/embed";
import type { EntityType } from "@/lib/supabase/types";

// -----------------------------------------------------------------------------
// Pipeline GraphRAG (Fase 13) — SOLO SERVER.
//
// Pasos: 1) recuperación vectorial · 2) expansión relacional · 3) reranking
//        · 4) context builder. (El paso 5, respuesta de Claude, vive en la route.)
//
// Combina SQL (documentos de entidad) + Knowledge Graph (relationships) +
// Embeddings (match_embeddings). Respeta la visibilidad: onlyPublic = !panel.
// -----------------------------------------------------------------------------

// Documento textual por entidad (nombre/título + campos con significado).
const ENTITY_DOC: Record<
  EntityType,
  { name: string; fields: string[] }
> = {
  misiones: { name: "nombre", fields: ["nombre", "descripcion", "problema"] },
  retos: { name: "nombre", fields: ["nombre", "descripcion"] },
  agentes: { name: "nombre", fields: ["nombre", "descripcion", "tipo_agente", "municipio_sede"] },
  proyectos: { name: "nombre", fields: ["nombre", "descripcion", "financiador"] },
  innovaciones: { name: "nombre", fields: ["nombre", "descripcion"] },
  hallazgos: { name: "titulo", fields: ["titulo", "descripcion", "evidencia_cuantitativa"] },
  recomendaciones: { name: "titulo", fields: ["titulo", "descripcion", "destinatarios"] },
};

export interface Seed {
  entity_type: EntityType;
  entity_id: string;
  score: number;
}

export interface RelatedEdge {
  entity_type: EntityType;
  entity_id: string;
  relation_code: string | null;
  relation_name: string | null;
  direction: string;
  seed_type: EntityType;
  seed_id: string;
}

export interface RankedItem {
  entity_type: EntityType;
  entity_id: string;
  score: number;
  origin: "vector" | "grafo";
}

export interface ContextItem extends RankedItem {
  title: string | null;
  document: string;
  cite: number; // índice de cita [n] en el contexto
}

const key = (t: string, id: string) => `${t}:${id}`;

// -----------------------------------------------------------------------------
// 1. Recuperación vectorial
// -----------------------------------------------------------------------------
export async function retrieveVector(
  supabase: SupabaseClient,
  query: string,
  onlyPublic: boolean,
  k: number,
): Promise<Seed[]> {
  const queryVector = await embedText(query);
  const { data, error } = await supabase.rpc("match_embeddings", {
    query_embedding: queryVector,
    match_count: k,
    filter_entity_type: null,
    only_public: onlyPublic,
  });
  if (error) throw new Error(`match_embeddings: ${error.message}`);
  return ((data ?? []) as unknown as Array<{
    entity_type: EntityType;
    entity_id: string;
    similarity: number;
  }>).map((m) => ({
    entity_type: m.entity_type,
    entity_id: m.entity_id,
    score: m.similarity,
  }));
}

// -----------------------------------------------------------------------------
// 2. Expansión relacional (Knowledge Graph, 1 salto)
// -----------------------------------------------------------------------------
export async function expandGraph(
  supabase: SupabaseClient,
  seeds: Seed[],
  onlyPublic: boolean,
  limit: number,
): Promise<RelatedEdge[]> {
  if (seeds.length === 0) return [];
  const { data, error } = await supabase.rpc("graphrag_related", {
    p_types: seeds.map((s) => s.entity_type),
    p_ids: seeds.map((s) => s.entity_id),
    only_public: onlyPublic,
    p_limit: limit,
  });
  if (error) throw new Error(`graphrag_related: ${error.message}`);
  return (data ?? []) as unknown as RelatedEdge[];
}

// -----------------------------------------------------------------------------
// 3. Reranking: combina score vectorial + señal del grafo (conexión a semillas)
// -----------------------------------------------------------------------------
export function rerank(seeds: Seed[], related: RelatedEdge[]): RankedItem[] {
  const scores = new Map<string, RankedItem>();
  const seedScore = new Map<string, number>();

  for (const s of seeds) {
    const k = key(s.entity_type, s.entity_id);
    seedScore.set(k, s.score);
    scores.set(k, { entity_type: s.entity_type, entity_id: s.entity_id, score: s.score, origin: "vector" });
  }

  for (const r of related) {
    const k = key(r.entity_type, r.entity_id);
    const existing = scores.get(k);
    if (existing?.origin === "vector") continue; // ya es semilla vectorial: prevalece
    const parent = seedScore.get(key(r.seed_type, r.seed_id)) ?? 0.5;
    const derived = parent * 0.6;
    if (!existing) {
      scores.set(k, { entity_type: r.entity_type, entity_id: r.entity_id, score: derived, origin: "grafo" });
    } else {
      // Conectada a varias semillas → pequeño refuerzo.
      existing.score = Math.max(existing.score, derived) + 0.03;
    }
  }

  return [...scores.values()].sort((a, b) => b.score - a.score);
}

// -----------------------------------------------------------------------------
// 4. Context builder: documentos de las entidades + citas numeradas
// -----------------------------------------------------------------------------
export async function buildContext(
  supabase: SupabaseClient,
  ranked: RankedItem[],
  maxItems: number,
): Promise<{ items: ContextItem[]; contextText: string }> {
  const top = ranked.slice(0, maxItems);
  if (top.length === 0) return { items: [], contextText: "" };

  // Agrupar ids por tipo y traer los campos del documento (bajo RLS).
  const idsByType = new Map<EntityType, string[]>();
  for (const r of top) {
    const list = idsByType.get(r.entity_type) ?? [];
    list.push(r.entity_id);
    idsByType.set(r.entity_type, list);
  }

  const rows = new Map<string, Record<string, unknown>>();
  await Promise.all(
    [...idsByType.entries()].map(async ([type, ids]) => {
      const def = ENTITY_DOC[type];
      const { data } = await supabase.from(type).select(`id, ${def.fields.join(", ")}`).in("id", ids);
      for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
        rows.set(key(type, row.id as string), row);
      }
    }),
  );

  const items: ContextItem[] = [];
  let cite = 0;
  for (const r of top) {
    const row = rows.get(key(r.entity_type, r.entity_id));
    if (!row) continue; // no visible bajo RLS → se omite (defensa en profundidad)
    const def = ENTITY_DOC[r.entity_type];
    const lines: string[] = [];
    for (const f of def.fields) {
      const v = row[f];
      if (v === null || v === undefined || v === "") continue;
      const value = Array.isArray(v) ? v.join(", ") : String(v);
      if (value.trim()) lines.push(`${f}: ${value.trim()}`);
    }
    const document = lines.join("\n");
    if (!document.trim()) continue;
    cite += 1;
    items.push({
      ...r,
      title: (row[def.name] as string | null) ?? null,
      document,
      cite,
    });
  }

  const contextText = items
    .map((it) => `[${it.cite}] (${it.entity_type}/${it.entity_id})\n${it.document}`)
    .join("\n\n---\n\n");

  return { items, contextText };
}
