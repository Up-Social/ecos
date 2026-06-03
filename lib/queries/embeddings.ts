import { createClient } from "@/lib/supabase/client";
import type { EmbeddingJob, EmbeddingJobStatus } from "@/lib/supabase/types";

// -----------------------------------------------------------------------------
// Lectura de la infraestructura de embeddings (Fase 10), desde el browser.
//
// SOLO LECTURA para el panel: la escritura (generación/actualización de vectores
// y de la cola) es exclusiva del worker (service-role). Bajo RLS, estas queries
// solo devuelven datos a usuarios con PANEL_ROLES.
//
// El monitor de salud de la cola y el botón de re-encolar se construyen en la
// Fase 11; aquí solo se expone la superficie de lectura.
// -----------------------------------------------------------------------------

const supabase = createClient();

/** Lista jobs de la cola (opcionalmente filtrados por estado), más recientes primero. */
export async function listEmbeddingJobs(status?: EmbeddingJobStatus, limit = 100) {
  let query = supabase
    .from("embedding_jobs")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  return query.returns<EmbeddingJob[]>();
}

/** Cuenta los jobs por estado (salud de la cola). */
export async function getEmbeddingJobStats() {
  const estados: EmbeddingJobStatus[] = ["pending", "processing", "done", "error"];
  const counts: Record<EmbeddingJobStatus, number> = {
    pending: 0,
    processing: 0,
    done: 0,
    error: 0,
  };

  const results = await Promise.all(
    estados.map((estado) =>
      supabase
        .from("embedding_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", estado),
    ),
  );

  const error = results.find((r) => r.error)?.error ?? null;
  results.forEach((r, i) => {
    counts[estados[i]] = r.count ?? 0;
  });

  return { data: counts, error };
}

/** Número total de entidades con embedding generado. */
export async function getEmbeddingsCount() {
  return supabase
    .from("embeddings")
    .select("*", { count: "exact", head: true });
}

// -----------------------------------------------------------------------------
// Acciones del monitor (Fase 11). Disparo manual del worker y backfill.
// -----------------------------------------------------------------------------

/** Procesa un lote de la cola llamando al worker (`POST /api/embeddings`). */
export async function processEmbeddingsBatch(limit?: number) {
  const res = await fetch("/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(limit ? { limit } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { data: null, error: { message: json?.error ?? "Error al procesar la cola" } };
  }
  return { data: json as Record<string, number>, error: null };
}

/** Encola (o reactiva) un embedding_job para TODAS las entidades existentes. */
export async function reindexAllEmbeddings() {
  return supabase.rpc("enqueue_all_embeddings");
}
