"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FolderKanban,
  Lightbulb,
  Flag,
  Microscope,
  Megaphone,
  ArrowUpRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMission } from "@/lib/contexts/MissionContext";
import { getKPIs, type KPIs } from "@/lib/queries/kpis";
import { cn } from "@/lib/utils";

// =============================================================================
// Configuración de las tarjetas
// =============================================================================

interface KpiCardConfig {
  key: keyof KPIs;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Capa ECOS a la que pertenece. */
  layer: string;
  accent: string;
}

const CARDS: KpiCardConfig[] = [
  {
    key: "agentes",
    label: "Agentes",
    href: "/dashboard/agentes",
    icon: Users,
    layer: "Mapeo",
    accent: "text-blue-600 bg-blue-50",
  },
  {
    key: "proyectos",
    label: "Proyectos",
    href: "/dashboard/proyectos",
    icon: FolderKanban,
    layer: "Mapeo",
    accent: "text-indigo-600 bg-indigo-50",
  },
  {
    key: "retos",
    label: "Retos",
    href: "/dashboard/retos",
    icon: Flag,
    layer: "Propósito",
    accent: "text-amber-600 bg-amber-50",
  },
  {
    key: "innovaciones",
    label: "Innovaciones",
    href: "/dashboard/innovaciones",
    icon: Lightbulb,
    layer: "Experimentación",
    accent: "text-purple-600 bg-purple-50",
  },
  {
    key: "hallazgos",
    label: "Hallazgos",
    href: "/dashboard/hallazgos",
    icon: Microscope,
    layer: "Aprendizaje",
    accent: "text-emerald-600 bg-emerald-50",
  },
  {
    key: "recomendaciones",
    label: "Recomendaciones",
    href: "/dashboard/recomendaciones",
    icon: Megaphone,
    layer: "Transferencia",
    accent: "text-rose-600 bg-rose-50",
  },
];

// =============================================================================
// KPIGrid
// =============================================================================

export function KPIGrid() {
  const { selectedMisionId, selectedMision } = useMission();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getKPIs(selectedMisionId).then((data) => {
      if (cancelled) return;
      setKpis(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMisionId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          Indicadores estratégicos
        </h2>
        {selectedMision && (
          <p className="text-xs text-slate-500">
            Filtrado por:{" "}
            <span className="font-medium text-slate-700">
              {selectedMision.nombre}
            </span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {CARDS.map((card) => (
          <KPICard
            key={card.key}
            config={card}
            value={kpis?.[card.key] ?? null}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// KPICard
// =============================================================================

function KPICard({
  config,
  value,
  loading,
}: {
  config: KpiCardConfig;
  value: number | null;
  loading: boolean;
}) {
  const Icon = config.icon;

  return (
    <Link
      href={config.href}
      className="group relative flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            config.accent,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div>
        {loading ? (
          <Skeleton className="h-7 w-12" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
            {value?.toLocaleString("es-ES") ?? "—"}
          </p>
        )}
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <p className="text-xs font-medium text-slate-700">{config.label}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">
            {config.layer}
          </p>
        </div>
      </div>
    </Link>
  );
}
