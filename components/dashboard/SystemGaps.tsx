"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Flag,
  Target,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMission } from "@/lib/contexts/MissionContext";
import { getSystemGaps, type SystemGaps as Gaps } from "@/lib/queries/gaps";
import { cn } from "@/lib/utils";

// =============================================================================
// Componente principal
// =============================================================================

export function SystemGaps() {
  const { selectedMisionId } = useMission();
  const [gaps, setGaps] = useState<Gaps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSystemGaps(selectedMisionId).then((data) => {
      if (cancelled) return;
      setGaps(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMisionId]);

  const totalAlertas =
    (gaps?.retosHuerfanos.length ?? 0) +
    (gaps?.misionesBajaActividad.length ?? 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Vacíos del sistema
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Insights automáticos para detectar áreas que necesitan atención.
          </p>
        </div>
        {!loading && gaps && (
          <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                totalAlertas === 0 ? "bg-green-500" : "bg-amber-500",
              )}
            />
            <span className="text-xs font-medium text-slate-700">
              {totalAlertas === 0
                ? "Todo OK"
                : `${totalAlertas} alerta${totalAlertas > 1 ? "s" : ""}`}
            </span>
          </div>
        )}
      </header>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !gaps || totalAlertas === 0 ? (
        <AllGoodState />
      ) : (
        <div className="space-y-4">
          {gaps.retosHuerfanos.length > 0 && (
            <InsightSection
              icon={Flag}
              title="Retos sin innovaciones"
              description="Estos retos no están siendo abordados por ninguna innovación."
              tone="red"
              count={gaps.retosHuerfanos.length}
              items={gaps.retosHuerfanos.map((r) => ({
                id: r.id,
                primary: r.nombre,
                href: "/dashboard/retos",
              }))}
            />
          )}

          {gaps.misionesBajaActividad.length > 0 && (
            <InsightSection
              icon={Target}
              title="Misiones con baja actividad"
              description={`Misiones con menos de ${gaps.umbral} innovaciones derivadas.`}
              tone="amber"
              count={gaps.misionesBajaActividad.length}
              items={gaps.misionesBajaActividad.map((m) => ({
                id: m.id,
                primary: m.nombre,
                meta: `${m.innovaciones_count} innovación${m.innovaciones_count === 1 ? "" : "es"}`,
                href: "/dashboard/misiones",
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sección de insight (un grupo de alertas con icono y tono)
// =============================================================================

interface InsightItem {
  id: string;
  primary: string;
  meta?: string;
  href: string;
}

const tones = {
  red: {
    bg: "bg-red-50",
    border: "border-red-100",
    icon: "text-red-600",
    badge: "bg-red-100 text-red-700",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    icon: "text-amber-600",
    badge: "bg-amber-100 text-amber-800",
  },
} as const;

function InsightSection({
  icon: Icon,
  title,
  description,
  tone,
  count,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tone: keyof typeof tones;
  count: number;
  items: InsightItem[];
}) {
  const t = tones[tone];

  return (
    <section className={cn("rounded-md border", t.border, t.bg)}>
      <header className="flex items-start gap-2 border-b border-current/10 px-3 py-2.5">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white",
          )}
        >
          <Icon className={cn("h-4 w-4", t.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-slate-900">{title}</h3>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                t.badge,
              )}
            >
              {count}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-600">{description}</p>
        </div>
      </header>
      <ul className="divide-y divide-current/5">
        {items.slice(0, 5).map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group flex items-center justify-between px-3 py-2 text-xs hover:bg-white/60"
            >
              <span className="truncate font-medium text-slate-800">
                {item.primary}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-slate-500">
                {item.meta && <span className="font-mono">{item.meta}</span>}
                <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </Link>
          </li>
        ))}
        {items.length > 5 && (
          <li className="px-3 py-2 text-center text-[11px] text-slate-500">
            … y {items.length - 5} más
          </li>
        )}
      </ul>
    </section>
  );
}

// =============================================================================
// Estado "todo bien"
// =============================================================================

function AllGoodState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-green-200 bg-green-50/50 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900">Sin vacíos detectados</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Todos los retos tienen cobertura y las misiones tienen actividad
          suficiente.
        </p>
      </div>
    </div>
  );
}
