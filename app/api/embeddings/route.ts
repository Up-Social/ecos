import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserWithRoles } from "@/lib/auth/getCurrentUser";
import { canAccessPanel } from "@/lib/auth/roles";

export const runtime = "nodejs";

// =============================================================================
// /api/embeddings  (ECOS v2 · Fase 10)
//
// Worker de la cola de embeddings. POST procesa un lote de `embedding_jobs` y
// mantiene la tabla `embeddings`. Implementa:
//
//   - GENERACIÓN   : construye el documento textual de la entidad, lo embebe y
//                    hace UPSERT.
//   - ACTUALIZACIÓN: idempotente por `content_hash` (no re-embeddea si el texto
//                    no cambió frente al embedding ya guardado).
//   - REINTENTOS   : ante fallo incrementa `attempts` y reprograma con backoff
//                    exponencial (`run_after`); marca `error` tras MAX_ATTEMPTS.
//
// NO implementa GraphRAG ni recuperación: solo mantiene los vectores al día.
//
// Mismo patrón de secretos que /api/insights: lee `process.env` (Vercel +
// .env.local). Decisión cerrada (regla 16): OpenAI `text-embedding-3-small` /
// 1536, vía OPENAI_API_KEY. Overridable por EMBEDDINGS_* sin tocar código.
//
// Auth: la ruta está protegida por el middleware (`/api/*` → PANEL_ROLES) y se
// re-comprueba aquí (defensa en profundidad). El disparo por cron es Fase 11.
//
// Escritura con cliente service-role (sortea RLS), como el resto de operaciones
// privilegiadas server-side.
// =============================================================================

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

// -----------------------------------------------------------------------------
// Configuración por entorno (defaults = decisión cerrada regla 16).
// -----------------------------------------------------------------------------

const PROVIDER = (process.env.EMBEDDINGS_PROVIDER ?? "openai").toLowerCase();
const MODEL =
  process.env.EMBEDDINGS_MODEL ??
  (PROVIDER === "voyage" ? "voyage-3" : "text-embedding-3-small");
const DIMENSION = Number(process.env.EMBEDDINGS_DIMENSION ?? "1536");
const API_KEY =
  process.env.EMBEDDINGS_API_KEY ??
  process.env.OPENAI_API_KEY ??
  process.env.VOYAGE_API_KEY ??
  "";
const BATCH = Math.max(1, Number(process.env.EMBEDDINGS_BATCH ?? "10"));
const MAX_ATTEMPTS = Math.max(1, Number(process.env.EMBEDDINGS_MAX_ATTEMPTS ?? "3"));
// Backoff base en segundos: run_after = now + BASE * 2^(attempts-1).
const BACKOFF_BASE_SECONDS = Math.max(1, Number(process.env.EMBEDDINGS_BACKOFF_BASE ?? "30"));

// -----------------------------------------------------------------------------
// Documento textual por entidad (solo campos propios; la expansión por
// relaciones es del GraphRAG, fuera de alcance).
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

/** SHA-256 hex del documento (Web Crypto, global en Node 18+). */
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// -----------------------------------------------------------------------------
// Proveedor de embeddings (configurable).
// -----------------------------------------------------------------------------

async function embed(texts: string[]): Promise<number[][]> {
  if (!API_KEY) {
    throw new Error(
      "OPENAI_API_KEY (o EMBEDDINGS_API_KEY) no configurada: imposible generar embeddings.",
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
  if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return data.data.map((d) => d.embedding);
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
  if (!res.ok) throw new Error(`Voyage embeddings ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return data.data.map((d) => d.embedding);
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

async function markFailure(supabase: SupabaseClient, job: EmbeddingJob, message: string) {
  if (job.attempts >= MAX_ATTEMPTS) {
    await supabase
      .from("embedding_jobs")
      .update({ status: "error", last_error: message })
      .eq("id", job.id);
    return;
  }
  const delaySec = BACKOFF_BASE_SECONDS * Math.pow(2, job.attempts - 1);
  const runAfter = new Date(Date.now() + delaySec * 1000).toISOString();
  await supabase
    .from("embedding_jobs")
    .update({ status: "pending", last_error: message, run_after: runAfter })
    .eq("id", job.id);
}

type Outcome = "done" | "skipped" | "failed";

async function processJob(supabase: SupabaseClient, job: EmbeddingJob): Promise<Outcome> {
  try {
    const def = ENTITY_DOC[job.entity_type];
    if (!def) throw new Error(`entity_type desconocido: ${job.entity_type}`);

    const { data: row, error: rowErr } = await supabase
      .from(def.table)
      .select(def.fields.join(", "))
      .eq("id", job.entity_id)
      .maybeSingle();

    if (rowErr) throw new Error(`carga de entidad: ${rowErr.message}`);
    if (!row) {
      // La entidad ya no existe: nada que embeber.
      await markDone(supabase, job.id);
      return "skipped";
    }

    const document = buildDocument(job.entity_type, row as unknown as Record<string, unknown>);
    if (!document.trim()) {
      await markDone(supabase, job.id);
      return "skipped";
    }
    const hash = await sha256(document);

    // ACTUALIZACIÓN idempotente: si el hash coincide, omitir la llamada al proveedor.
    const { data: existing } = await supabase
      .from("embeddings")
      .select("content_hash")
      .eq("entity_type", job.entity_type)
      .eq("entity_id", job.entity_id)
      .maybeSingle();

    const existingHash = (existing as unknown as { content_hash: string } | null)?.content_hash;
    if (existingHash === hash) {
      await markDone(supabase, job.id);
      return "skipped";
    }

    // GENERACIÓN: embeber y UPSERT.
    const [vector] = await embed([document]);
    const { error: upErr } = await supabase.from("embeddings").upsert(
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
// Procesamiento de un lote de la cola (compartido por POST manual y GET cron).
// -----------------------------------------------------------------------------

async function runBatch(limit: number) {
  const supabase = createAdminClient();

  // Reclamar lote (atómico, SKIP LOCKED) vía RPC SECURITY DEFINER.
  const { data: jobsData, error: claimErr } = await supabase.rpc("claim_embedding_jobs", {
    p_limit: limit,
  });
  if (claimErr) {
    return NextResponse.json({ error: `claim_embedding_jobs: ${claimErr.message}` }, { status: 500 });
  }

  const jobs = (jobsData ?? []) as unknown as EmbeddingJob[];
  const summary = { claimed: jobs.length, done: 0, skipped: 0, failed: 0 };
  for (const job of jobs) {
    const outcome = await processJob(supabase, job);
    summary[outcome] += 1;
  }

  return NextResponse.json({ ...summary, provider: PROVIDER, model: MODEL, dimension: DIMENSION });
}

// -----------------------------------------------------------------------------
// POST → disparo MANUAL desde el panel (sesión con PANEL_ROLES).
// -----------------------------------------------------------------------------

export async function POST(req: Request) {
  // Defensa en profundidad (el middleware ya exige PANEL_ROLES en /api/*).
  const current = await getCurrentUserWithRoles();
  if (!current) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canAccessPanel(current.roles)) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  // Tamaño de lote (override por body opcional).
  let limit = BATCH;
  try {
    const body = await req.json();
    if (body && typeof body.limit === "number") limit = Math.max(1, body.limit);
  } catch {
    // body vacío o no-JSON → usar BATCH.
  }

  return runBatch(limit);
}

// -----------------------------------------------------------------------------
// GET → disparo automático por CRON (Vercel Cron). Autenticado con CRON_SECRET.
// El middleware deja pasar esta petición solo si el secreto coincide; aquí se
// revalida (defensa en profundidad). Sin CRON_SECRET configurado → 401.
// -----------------------------------------------------------------------------

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return runBatch(BATCH);
}
