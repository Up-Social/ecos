"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flag, AlertCircle, TrendingUp, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useMission } from "@/lib/contexts/MissionContext";
import { getRetosCobertura, type RetoCobertura } from "@/lib/queries/coverage";
import { cn } from "@/lib/utils";

// =============================================================================
// Componente
// =============================================================================

export function RetosCoverage() {
  const { selectedMisionId, selectedMision } = useMission();
  const [retos, setRetos] = useState<RetoCobertura[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRetosCobertura(selectedMisionId).then((data) => {
      if (cancelled) return;
      setRetos(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMisionId]);

  // ---------------------------------------------------------------------------
  // Cálculos derivados
  // ---------------------------------------------------------------------------
  const stats = useMemo(() => {
    if (retos.length === 0) {
      return { max: 0, avg: 0, sinCobertura: 0, total: 0 };
    }
    const counts = retos.map((r) => r.innovaciones_count);
    const max = Math.max(...counts);
    const sum = counts.reduce((a, b) => a + b, 0);
    return {
      max,
      avg: sum / retos.length,
      sinCobertura: counts.filter((c) => c === 0).length,
      total: retos.length,
    };
  }, [retos]);

  // Ordenado: primero los de mayor cobertura, luego los huérfanos al final
  // (o al revés, según preferencia). Vamos por mayor → menor para ver
  // los más activos primero.
  const sorted = useMemo(
    () => [...retos].sort((a, b) => b.innovaciones_count - a.innovaciones_count),
    [retos],
  );

  // Umbral de "alta concentración": > 1.5x del promedio Y al menos 3
  const concentrationThreshold = Math.max(3, stats.avg * 1.5);

  // ---------------------------------------------------------------------------
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Cobertura de retos
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Innovaciones que están abordando cada reto. Detecta huecos y
            sobreconcentraciones.
          </p>
        </div>
        {!loading && retos.length > 0 && (
          <div className="flex gap-3 text-right">
            <Stat label="Retos" value={stats.total} />
            <Stat
              label="Sin cobertura"
              value={stats.sinCobertura}
              tone={stats.sinCobertura > 0 ? "red" : "default"}
            />
          </div>
        )}
      </header>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : retos.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No hay retos que mostrar"
          description={
            selectedMision
              ? "Esta misión todavía no tiene retos vinculados."
              : "Crea retos y vincúlalos a innovaciones para ver su cobertura."
          }
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((r) => (
            <CoverageRow
              key={r.id}
              reto={r}
              max={stats.max}
              concentrationThreshold={concentrationThreshold}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// =============================================================================
// Subcomponentes
// =============================================================================

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "red";
}) {
  return (
    <div>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "red" ? "text-red-600" : "text-slate-900",
        )}
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </p>
    </div>
  );
}

function CoverageRow({
  reto,
  max,
  concentrationThreshold,
}: {
  reto: RetoCobertura;
  max: number;
  concentrationThreshold: number;
}) {
  const count = reto.innovaciones_count;
  const isEmpty = count === 0;
  const isConcentrated = count >= concentrationThreshold && count > 0;
  // Ancho de la barra: proporcional al máximo, con un mínimo del 4% para
  // que las barras pequeñas se vean
  const widthPct = max === 0 ? 0 : Math.max((count / max) * 100, isEmpty ? 0 : 4);

  return (
    <li>
      <Link
        href={`/dashboard/retos`}
        className="group block rounded-md border border-transparent px-3 py-2 hover:border-slate-200 hover:bg-slate-50"
      >
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-slate-900">
              {reto.nombre}
            </span>
            {isEmpty && (
              <Badge tone="red">
                <AlertCircle className="mr-1 h-3 w-3" />
                Sin cobertura
              </Badge>
            )}
            {isConcentrated && (
              <Badge tone="amber">
                <TrendingUp className="mr-1 h-3 w-3" />
                Concentrado
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs">
            <span
              className={cn(
                "font-mono tabular-nums",
                isEmpty ? "text-slate-400" : "text-slate-700",
              )}
            >
              {count}
            </span>
            <span className="text-slate-400">
              {count === 1 ? "innovación" : "innovaciones"}
            </span>
            <ArrowUpRight className="ml-1 h-3 w-3 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isEmpty
                ? "bg-red-200"
                : isConcentrated
                  ? "bg-amber-500"
                  : "bg-brand-500",
            )}
            style={{ width: `${widthPct}%` }}
          />
        </div>
      </Link>
    </li>
  );
}
