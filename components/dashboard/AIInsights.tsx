"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Users2,
  GraduationCap,
  Hourglass,
  CheckCircle2,
  Lock,
  Wrench,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMission } from "@/lib/contexts/MissionContext";
import {
  getLatestInsight,
  streamInsights,
  type Insight,
  type StreamPhase,
} from "@/lib/queries/insights";
import { cn } from "@/lib/utils";

// =============================================================================
// Configuración visual de tipos y prioridades
// =============================================================================

const tipoMeta: Record<
  Insight["tipo"],
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  vacio: {
    label: "Vacío",
    icon: AlertCircle,
    tone: "bg-red-50 text-red-700 border-red-200",
  },
  oportunidad: {
    label: "Oportunidad",
    icon: TrendingUp,
    tone: "bg-blue-50 text-blue-700 border-blue-200",
  },
  concentracion: {
    label: "Concentración",
    icon: Users2,
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  madurez: {
    label: "Madurez",
    icon: GraduationCap,
    tone: "bg-purple-50 text-purple-700 border-purple-200",
  },
  cuello_botella: {
    label: "Cuello de botella",
    icon: Hourglass,
    tone: "bg-orange-50 text-orange-700 border-orange-200",
  },
  fortaleza: {
    label: "Fortaleza",
    icon: CheckCircle2,
    tone: "bg-green-50 text-green-700 border-green-200",
  },
};

const prioridadDot: Record<Insight["prioridad"], string> = {
  alta: "bg-red-500",
  media: "bg-amber-500",
  baja: "bg-slate-300",
};

// Labels de las fases de streaming
const phaseLabel: Record<StreamPhase, string> = {
  loading_snapshot: "Cargando datos…",
  thinking: "Pensando…",
  tool_call: "Consultando detalles…",
  writing: "Escribiendo insights…",
};

// =============================================================================
// Helpers
// =============================================================================

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

function timeAgo(date: Date): string {
  const diffSec = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(Math.round(diffSec), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
}

interface UIData {
  resumen: string;
  insights: Insight[];
}

// =============================================================================
// Componente principal
// =============================================================================

export function AIInsights() {
  const { selectedMisionId, selectedMision } = useMission();
  const [data, setData] = useState<UIData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [phase, setPhase] = useState<StreamPhase | null>(null);
  const [phaseDetail, setPhaseDetail] = useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Al cambiar misión: cargar última lectura del histórico
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!selectedMisionId) {
      setData(null);
      setLastGeneratedAt(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    setData(null);
    setError(null);
    getLatestInsight(selectedMisionId)
      .then((latest) => {
        if (cancelled) return;
        if (latest) {
          setData({
            resumen: latest.resumen ?? "",
            insights: latest.insights,
          });
          setLastGeneratedAt(new Date(latest.created_at));
        } else {
          setData(null);
          setLastGeneratedAt(null);
        }
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message ?? "Error cargando histórico");
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMisionId]);

  // ---------------------------------------------------------------------------
  // Regenerar (stream)
  // ---------------------------------------------------------------------------
  async function regenerate() {
    if (!selectedMisionId || streaming) return;
    setStreaming(true);
    setError(null);
    setPhase("loading_snapshot");
    setPhaseDetail(null);
    setData({ resumen: "", insights: [] });

    await streamInsights(selectedMisionId, {
      onStatus: (newPhase, detail) => {
        setPhase(newPhase);
        if (newPhase === "tool_call" && detail?.tool) {
          setPhaseDetail(String(detail.tool));
        } else {
          setPhaseDetail(null);
        }
      },
      onResumen: (text) => {
        setData((d) => ({
          resumen: text,
          insights: d?.insights ?? [],
        }));
      },
      onInsight: (insight) => {
        setData((d) => ({
          resumen: d?.resumen ?? "",
          insights: [...(d?.insights ?? []), insight],
        }));
      },
      onDone: () => {
        setStreaming(false);
        setPhase(null);
        setPhaseDetail(null);
        setLastGeneratedAt(new Date());
      },
      onError: (msg) => {
        setError(msg);
        setStreaming(false);
        setPhase(null);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Sin misión seleccionada
  // ---------------------------------------------------------------------------
  if (!selectedMisionId) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-50">
            <Lock className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Insights estratégicos
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Selecciona una misión en el topbar para generar insights
              automáticos sobre su estado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasData = data && (data.insights.length > 0 || data.resumen);
  const buttonLabel = streaming
    ? "Analizando…"
    : hasData
      ? "Regenerar"
      : "Generar";

  return (
    <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-white to-brand-50/30 p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-100">
            <Sparkles className="h-4 w-4 text-brand-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Insights estratégicos
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Generados por IA a partir del snapshot de{" "}
              <span className="font-medium text-slate-700">
                {selectedMision?.nombre}
              </span>
              .
            </p>
            {lastGeneratedAt && !streaming && (
              <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-400">
                <Clock className="h-3 w-3" />
                Última lectura {timeAgo(lastGeneratedAt)}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={regenerate}
          loading={streaming}
          disabled={streaming || loadingHistory}
        >
          {!streaming && <RefreshCw className="h-3.5 w-3.5" />}
          {buttonLabel}
        </Button>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* Status pill durante streaming                                      */}
      {/* ----------------------------------------------------------------- */}
      {streaming && phase && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] text-brand-700">
          {phase === "tool_call" ? (
            <Wrench className="h-3 w-3" />
          ) : (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
          )}
          <span className="font-medium">
            {phaseLabel[phase]}
            {phaseDetail && (
              <span className="text-brand-500"> · {phaseDetail}</span>
            )}
          </span>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Loading inicial del histórico                                      */}
      {/* ----------------------------------------------------------------- */}
      {loadingHistory && !streaming && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-md border border-slate-200 bg-white p-3"
            >
              <Skeleton className="mb-2 h-3 w-24" />
              <Skeleton className="mb-1 h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Error                                                              */}
      {/* ----------------------------------------------------------------- */}
      {error && !streaming && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p className="mt-0.5 text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Empty (con misión, sin histórico, no streaming)                    */}
      {/* ----------------------------------------------------------------- */}
      {!loadingHistory && !streaming && !hasData && !error && (
        <div className="rounded-md border border-dashed border-slate-200 bg-white/60 p-6 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-brand-300" />
          <p className="text-xs text-slate-500">
            Haz click en <strong>Generar</strong> para que la IA analice esta
            misión y proponga insights accionables.
          </p>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Resultado (histórico o streaming en curso)                         */}
      {/* ----------------------------------------------------------------- */}
      {hasData && data && (
        <div className="space-y-3">
          {data.resumen && (
            <p className="rounded-md border border-brand-200 bg-white px-3 py-2 text-xs italic text-slate-700">
              <span className="not-italic font-semibold text-brand-700">
                Resumen ·{" "}
              </span>
              {data.resumen}
            </p>
          )}

          <ul className="space-y-2">
            {data.insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} animateIn={streaming} />
            ))}
          </ul>

          {!streaming && data.insights.length > 0 && (
            <p className="pt-1 text-right text-[10px] text-slate-400">
              Generado por Claude · {data.insights.length} insights
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Insight individual
// =============================================================================

function InsightCard({
  insight,
  animateIn,
}: {
  insight: Insight;
  animateIn: boolean;
}) {
  const meta = tipoMeta[insight.tipo] ?? tipoMeta.oportunidad;
  const Icon = meta.icon;

  return (
    <li
      className={cn(
        "rounded-md border border-slate-200 bg-white p-3",
        animateIn && "animate-in fade-in slide-in-from-bottom-1",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
            meta.tone,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {meta.label}
            </span>
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                prioridadDot[insight.prioridad],
              )}
              title={`Prioridad ${insight.prioridad}`}
              aria-label={`Prioridad ${insight.prioridad}`}
            />
            <span className="text-[10px] text-slate-400">
              {insight.prioridad}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-medium text-slate-900">
            {insight.titulo}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">{insight.descripcion}</p>
          {insight.evidencia && (
            <p className="mt-1 inline-block rounded bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              {insight.evidencia}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
