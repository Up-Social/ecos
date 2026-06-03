import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserWithRoles } from "@/lib/auth/getCurrentUser";
import { canAccessPanel } from "@/lib/auth/roles";
import { embedText } from "@/lib/embeddings/embed";
import { searchSchema } from "@/lib/schemas/search";
import type { EntityType, SearchResult, SearchSource } from "@/lib/supabase/types";

export const runtime = "nodejs";

// =============================================================================
// /api/search  (ECOS v2 · Fase 12) — Búsqueda semántica híbrida
//
// Combina filtros SQL (entity_type, is_public) + vector search (coseno, HNSW).
// GET  ?q=...&type=...&limit=...   ·   POST { q, entityType, limit }
//
// Acceso (control en el handler; el middleware deja pasar anónimos):
//   - Panel (PANEL_ROLES) → busca en TODO.
//   - Anónimo / no-panel   → solo entidades is_public (only_public=true).
//
// Devuelve: { query, results (con título + score), sources (entidad + score) }.
// No implementa GraphRAG (Fase 13).
// =============================================================================

const NAME_COLUMN: Record<EntityType, string> = {
  misiones: "nombre",
  retos: "nombre",
  agentes: "nombre",
  proyectos: "nombre",
  innovaciones: "nombre",
  hallazgos: "titulo",
  recomendaciones: "titulo",
};

interface Match {
  entity_type: EntityType;
  entity_id: string;
  similarity: number;
}

async function handleSearch(raw: {
  q?: unknown;
  entityType?: unknown;
  limit?: unknown;
}) {
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Consulta no válida" },
      { status: 400 },
    );
  }
  const { q, entityType, limit } = parsed.data;

  // Acceso: panel ve todo; el resto (anónimo o sin panel) solo lo público.
  const current = await getCurrentUserWithRoles();
  const isPanel = current ? canAccessPanel(current.roles) : false;
  const onlyPublic = !isPanel;

  // Embeber la consulta (mismo modelo que los embeddings almacenados).
  let queryVector: number[];
  try {
    queryVector = await embedText(q);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `No se pudo procesar la consulta: ${message}` }, { status: 500 });
  }

  const supabase = await createClient();

  // Búsqueda vectorial filtrada (RPC SECURITY DEFINER; aplica only_public).
  const { data: matchData, error: matchError } = await supabase.rpc("match_embeddings", {
    query_embedding: queryVector,
    match_count: limit,
    filter_entity_type: entityType ?? null,
    only_public: onlyPublic,
  });
  if (matchError) {
    return NextResponse.json({ error: `match_embeddings: ${matchError.message}` }, { status: 500 });
  }

  const matches = (matchData ?? []) as unknown as Match[];
  if (matches.length === 0) {
    return NextResponse.json({ query: q, results: [], sources: [] });
  }

  // Enriquecer con el nombre/título de cada entidad (bajo RLS → visibilidad coherente).
  const idsByType = new Map<EntityType, string[]>();
  for (const m of matches) {
    const list = idsByType.get(m.entity_type) ?? [];
    list.push(m.entity_id);
    idsByType.set(m.entity_type, list);
  }

  const titles = new Map<string, string | null>();
  await Promise.all(
    [...idsByType.entries()].map(async ([type, ids]) => {
      const col = NAME_COLUMN[type];
      const { data } = await supabase.from(type).select(`id, ${col}`).in("id", ids);
      for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
        titles.set(`${type}:${row.id as string}`, (row[col] as string | null) ?? null);
      }
    }),
  );

  const results: SearchResult[] = matches.map((m) => ({
    entity_type: m.entity_type,
    entity_id: m.entity_id,
    score: m.similarity,
    title: titles.get(`${m.entity_type}:${m.entity_id}`) ?? null,
  }));

  const sources: SearchSource[] = matches.map((m) => ({
    entity_type: m.entity_type,
    entity_id: m.entity_id,
    score: m.similarity,
  }));

  return NextResponse.json({ query: q, results, sources });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return handleSearch({
    q: searchParams.get("q") ?? undefined,
    entityType: searchParams.get("type") ?? searchParams.get("entityType") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // cuerpo vacío o no-JSON → validación devolverá 400
  }
  return handleSearch({
    q: body.q,
    entityType: body.entityType ?? body.type,
    limit: body.limit,
  });
}
