"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Play, Database, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import {
  listEmbeddingJobs,
  getEmbeddingJobStats,
  getEmbeddingsCount,
  processEmbeddingsBatch,
  reindexAllEmbeddings,
} from "@/lib/queries/embeddings";
import type { EmbeddingJob, EmbeddingJobStatus } from "@/lib/supabase/types";

// =============================================================================
// Monitor de embeddings (Fase 11)
//
// Salud de la cola (estados, recientes, errores) + acciones manuales:
//   · Procesar lote → POST /api/embeddings (el mismo worker que el cron)
//   · Reindexar todo → encola un job por cada entidad existente (backfill)
//
// Solo lectura sobre embedding_jobs/embeddings (RLS PANEL_ROLES). Auto-refresco
// ligero mientras haya trabajos activos.
// =============================================================================

const STATUS_TONE: Record<EmbeddingJobStatus, "slate" | "blue" | "green" | "amber" | "red"> = {
  pending: "amber",
  processing: "blue",
  done: "green",
  error: "red",
};

const STATUS_LABEL: Record<EmbeddingJobStatus, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  done: "Hecho",
  error: "Error",
};

type Stats = Record<EmbeddingJobStatus, number>;

export default function EmbeddingsPage() {
  const toast = useToast();
  const [stats, setStats] = useState<Stats>({ pending: 0, processing: 0, done: 0, error: 0 });
  const [total, setTotal] = useState(0);
  const [jobs, setJobs] = useState<EmbeddingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [statsRes, countRes, jobsRes] = await Promise.all([
      getEmbeddingJobStats(),
      getEmbeddingsCount(),
      listEmbeddingJobs(undefined, 50),
    ]);
    if (statsRes.data) setStats(statsRes.data);
    setTotal(countRes.count ?? 0);
    setJobs(jobsRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresco mientras haya jobs activos (pendientes/procesando).
  const active = stats.pending + stats.processing;
  useEffect(() => {
    if (active === 0) return;
    const id = setInterval(fetchAll, 5000);
    return () => clearInterval(id);
  }, [active, fetchAll]);

  async function handleProcess() {
    setProcessing(true);
    const { data, error } = await processEmbeddingsBatch();
    if (error) {
      toast.error("Error al procesar", error.message);
    } else if (data) {
      toast.success(
        "Lote procesado",
        `Reclamados ${data.claimed} · hechos ${data.done} · omitidos ${data.skipped} · fallidos ${data.failed}`,
      );
    }
    await fetchAll();
    setProcessing(false);
  }

  async function handleReindex() {
    setReindexing(true);
    const { data, error } = await reindexAllEmbeddings();
    if (error) {
      toast.error("Error al reindexar", error.message);
    } else {
      toast.success("Reindexado encolado", `${data ?? 0} entidades en cola`);
    }
    await fetchAll();
    setReindexing(false);
  }

  const errorJobs = jobs.filter((j) => j.status === "error");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Embeddings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Estado de la cola de vectorización. Los cambios en las entidades encolan
            trabajos automáticamente; el cron los procesa de forma periódica.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button variant="secondary" onClick={handleReindex} disabled={reindexing}>
            <Database className={`h-4 w-4 ${reindexing ? "animate-pulse" : ""}`} />
            Reindexar todo
          </Button>
          <Button onClick={handleProcess} disabled={processing}>
            <Play className={`h-4 w-4 ${processing ? "animate-pulse" : ""}`} />
            Procesar lote
          </Button>
        </div>
      </div>

      {/* Tarjetas de estado */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Embeddings" value={total} tone="slate" />
        <StatCard label="Pendientes" value={stats.pending} tone="amber" />
        <StatCard label="Procesando" value={stats.processing} tone="blue" />
        <StatCard label="Hechos" value={stats.done} tone="green" />
        <StatCard label="Errores" value={stats.error} tone="red" />
      </div>

      {/* Errores recientes */}
      {errorJobs.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-red-800">
            <AlertTriangle className="h-4 w-4" />
            {errorJobs.length} trabajo(s) con error
          </div>
          <ul className="mt-2 space-y-1 text-xs text-red-700">
            {errorJobs.slice(0, 5).map((j) => (
              <li key={j.id} className="truncate">
                <span className="font-mono">{j.entity_type}</span> — {j.last_error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabla de trabajos recientes */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <Th>Estado</Th>
              <Th>Entidad</Th>
              <Th>ID</Th>
              <Th>Intentos</Th>
              <Th>Actualizado</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                  {loading ? "Cargando…" : "La cola está vacía."}
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j.id}>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS_TONE[j.status]}>{STATUS_LABEL[j.status]}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{j.entity_type}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400">
                    {j.entity_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{j.attempts}</td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDate(j.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "amber" | "blue" | "green" | "red";
}) {
  const ring: Record<typeof tone, string> = {
    slate: "text-slate-900",
    amber: "text-amber-600",
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${ring[tone]}`}>{value}</p>
    </div>
  );
}
