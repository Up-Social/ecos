// =============================================================================
// Supabase Edge Function: process-embeddings  (ECOS v2 · Fase 10)
//
// Worker de la cola de embeddings. Procesa `embedding_jobs` y mantiene la tabla
// `embeddings`. Implementa:
//
//   - GENERACIÓN  : por cada job pendiente construye el documento textual de la
//                   entidad, lo embebe con el proveedor configurado y hace UPSERT.
//   - ACTUALIZACIÓN: idempotente por `content_hash`. Si el texto no cambió frente
//                   al embedding ya guardado, NO vuelve a llamar al proveedor.
//   - REINTENTOS  : ante fallo incrementa `attempts` y reprograma con backoff
//                   exponencial (run_after); marca `error` tras MAX_ATTEMPTS.
//
// NO implementa GraphRAG ni recuperación: solo mantiene los vectores al día.
//
// Disparo: manual (HTTP) o por cron (Fase 11). Usa service-role internamente
// (sortea RLS). `verify_jwt = false`; opcionalmente protegido por secreto
// compartido (EMBEDDINGS_WORKER_SECRET).
//
// Proveedor de embeddings CONFIGURABLE por entorno (decisión a validar, ver
// docs/PRE_IMPLEMENTATION_ANALYSIS.md §6). Sin clave configurada el worker no
// genera: marca los jobs en `error` con un mensaje claro, sin romper nada.
// =============================================================================

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// -----------------------------------------------------------------------------
// CORS / helpers de respuesta
// -----------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-worker-secret",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// -----------------------------------------------------------------------------
// Configuración por entorno
// -----------------------------------------------------------------------------

type EntityType =
  | "misiones" | "retos" | "agentes" | "proyectos"
  | "innovaciones" | "hallazgos" | "recomendaciones";

interface EmbeddingJob {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  status: string;
  attempts: number;
}

const PROVIDER = (Deno.env.get("EMBEDDINGS_PROVIDER") ?? "openai").toLowerCase();
const MODEL =
  Deno.env.get("EMBEDDINGS_MODEL") ??
  (PROVIDER === "voyage" ? "voyage-3" : "text-embedding-3-small");
const DIMENSION = Number(Deno.env.get("EMBEDDINGS_DIMENSION") ?? "1536");
const API_KEY =
  Deno.env.get("EMBEDDINGS_API_KEY") ??
  Deno.env.get("OPENAI_API_KEY") ??
  Deno.env.get("VOYAGE_API_KEY") ??
  "";
const BATCH = Math.max(1, Number(Deno.env.get("EMBEDDINGS_BATCH") ?? "10"));
const MAX_ATTEMPTS = Math.max(1, Number(Deno.env.get("EMBEDDINGS_MAX_ATTEMPTS") ?? "3"));
const WORKER_SECRET = Deno.env.get("EMBEDDINGS_WORKER_SECRET") ?? "";
// Backoff base en segundos: run_after = now + BASE * 2^(attempts-1).
const BACKOFF_BASE_SECONDS = Math.max(1, Number(Deno.env.get("EMBEDDINGS_BACKOFF_BASE") ?? "30"));

// -----------------------------------------------------------------------------
// Documento textual por entidad: columnas que aportan significado.
// (Solo campos propios de la entidad; la expansión por relaciones es del GraphRAG.)
// -----------------------------------------------------------------------------

const ENTITY_DOC: Record<EntityType, { table: string; fields: string[] }> = {
  misiones:        { table: "misiones",        fields: ["nombre", "descripcion", "problema"] },
  retos:           { table: "retos",           fields: ["nombre", "descripcion"] },
  agentes:         { table: "agentes",         fields: ["nombre", "descripcion", "tipo_agente", "municipio_sede"] },
  proyectos:       { table: "proyectos",       fields: ["nombre", "descripcion", "financiador"] },
  innovaciones:    { table: "innovaciones",    fields: ["nombre", "descripcion"] },
  hallazgos:       { table: "hallazgos",       fields: ["titulo", "descripcion", "evidencia_cuantitativa"] },
  recomendaciones: { table: "recomendaciones", fields: ["titulo", "descripcion", "destinatarios"] },
};

/** Construye el texto canónico de una entidad a partir de sus campos. */
function buildDocument(entityType: EntityType, row: Record<string, unknown>): string {
  const { fields } = ENTITY_DOC[entityType];
  const lines: string[] = [];
  for (const f of fields) {
    const v = row[f];
    if (v === null || v === undefined || v === "") continue;
    const value = Array.isArray(v) ? v.join(", ") : String(v);
    if (value.trim()) lines.push(`${f}: ${value.trim()}`);
  }
  return lines.join("\n");
}

/** SHA-256 hex del documento (Web Crypto, disponible en Deno). */
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// -----------------------------------------------------------------------------
// Proveedor de embeddings (configurable). Devuelve un vector por texto.
// -----------------------------------------------------------------------------

async function embed(texts: string[]): Promise<number[][]> {
  if (!API_KEY) {
    throw new Error(
      "EMBEDDINGS_API_KEY no configurada: imposible generar embeddings (decisión de proveedor pendiente).",
    );
  }
  if (PROVIDER === "openai") return embedOpenAI(texts);
  if (PROVIDER === "voyage") return embedVoyage(texts);
  throw new Error(`Proveedor de embeddings no soportado: ${PROVIDER}`);
}

async function embedOpenAI(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input: texts, dimensions: DIMENSION }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.data as Array<{ embedding: number[] }>).map((d) => d.embedding);
}

async function embedVoyage(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input: texts, output_dimension: DIMENSION }),
  });
  if (!res.ok) {
    throw new Error(`Voyage embeddings ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.data as Array<{ embedding: number[] }>).map((d) => d.embedding);
}

// -----------------------------------------------------------------------------
// Marcado de jobs (service-role: sortea RLS).
// -----------------------------------------------------------------------------

async function markDone(supabase: SupabaseClient, jobId: string) {
  await supabase
    .from("embedding_jobs")
    .update({ status: "done", last_error: null })
    .eq("id", jobId);
}

async function markFailure(
  supabase: SupabaseClient,
  job: EmbeddingJob,
  message: string,
) {
  const exhausted = job.attempts >= MAX_ATTEMPTS;
  if (exhausted) {
    await supabase
      .from("embedding_jobs")
      .update({ status: "error", last_error: message })
      .eq("id", job.id);
    return;
  }
  // Backoff exponencial: reprograma como 'pending'.
  const delaySec = BACKOFF_BASE_SECONDS * Math.pow(2, job.attempts - 1);
  const runAfter = new Date(Date.now() + delaySec * 1000).toISOString();
  await supabase
    .from("embedding_jobs")
    .update({ status: "pending", last_error: message, run_after: runAfter })
    .eq("id", job.id);
}

// -----------------------------------------------------------------------------
// Procesa un job individual. Devuelve el desenlace para el resumen.
// -----------------------------------------------------------------------------

type Outcome = "done" | "skipped" | "failed";

async function processJob(supabase: SupabaseClient, job: EmbeddingJob): Promise<Outcome> {
  try {
    const def = ENTITY_DOC[job.entity_type];
    if (!def) throw new Error(`entity_type desconocido: ${job.entity_type}`);

    // 1. Cargar la entidad y construir el documento.
    const { data: row, error: rowErr } = await supabase
      .from(def.table)
      .select(def.fields.join(", "))
      .eq("id", job.entity_id)
      .maybeSingle();

    if (rowErr) throw new Error(`carga de entidad: ${rowErr.message}`);
    if (!row) {
      // La entidad ya no existe: el job se considera resuelto (no hay nada que embeber).
      await markDone(supabase, job.id);
      return "skipped";
    }

    const document = buildDocument(job.entity_type, row as Record<string, unknown>);
    if (!document.trim()) {
      await markDone(supabase, job.id);
      return "skipped";
    }
    const hash = await sha256(document);

    // 2. ACTUALIZACIÓN idempotente: si el hash coincide con el guardado, omitir.
    const { data: existing } = await supabase
      .from("embeddings")
      .select("content_hash")
      .eq("entity_type", job.entity_type)
      .eq("entity_id", job.entity_id)
      .maybeSingle();

    if (existing && existing.content_hash === hash) {
      await markDone(supabase, job.id);
      return "skipped";
    }

    // 3. GENERACIÓN: embeber y UPSERT.
    const [vector] = await embed([document]);
    const { error: upErr } = await supabase
      .from("embeddings")
      .upsert(
        {
          entity_type: job.entity_type,
          entity_id: job.entity_id,
          content_hash: hash,
          embedding: vector,
          model: MODEL,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "entity_type,entity_id" },
      );
    if (upErr) throw new Error(`upsert embedding: ${upErr.message}`);

    await markDone(supabase, job.id);
    return "done";
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await markFailure(supabase, job, message);
    return "failed";
  }
}

// -----------------------------------------------------------------------------
// Entry point
// -----------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  // Protección opcional por secreto compartido (recomendado en producción).
  if (WORKER_SECRET) {
    const auth = req.headers.get("authorization") ?? "";
    const provided = req.headers.get("x-worker-secret") ?? auth.replace(/^Bearer\s+/i, "");
    if (provided !== WORKER_SECRET) return json({ error: "No autorizado" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  // Tamaño de lote (override por body opcional).
  let limit = BATCH;
  try {
    const body = await req.json();
    if (body && typeof body.limit === "number") limit = Math.max(1, body.limit);
  } catch {
    // body vacío o no-JSON: usar BATCH por defecto.
  }

  // Reclamar lote de jobs (atómico, SKIP LOCKED).
  const { data: jobs, error: claimErr } = await supabase
    .rpc("claim_embedding_jobs", { p_limit: limit })
    .returns<EmbeddingJob[]>();

  if (claimErr) return json({ error: `claim_embedding_jobs: ${claimErr.message}` }, 500);
  if (!jobs || jobs.length === 0) {
    return json({ claimed: 0, done: 0, skipped: 0, failed: 0, provider: PROVIDER, model: MODEL });
  }

  const summary = { claimed: jobs.length, done: 0, skipped: 0, failed: 0 };
  for (const job of jobs) {
    const outcome = await processJob(supabase, job);
    summary[outcome] += 1;
  }

  return json({ ...summary, provider: PROVIDER, model: MODEL, dimension: DIMENSION });
});
