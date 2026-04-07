"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone, ArrowUpRight, LayoutGrid, List } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useMission } from "@/lib/contexts/MissionContext";
import {
  getRecomendacionesEstrategicas,
  type RecomendacionLite,
} from "@/lib/queries/strategic";
import type {
  EstadoRecomendacion,
  AlcanceRecomendacion,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

// =============================================================================
// Configuración de estados y alcances
// =============================================================================

const estadoLabel: Record<EstadoRecomendacion, string> = {
  formulada: "Formulada",
  en_proceso: "En proceso",
  adoptada: "Adoptada",
  descartada: "Descartada",
};

const estadoTone: Record<
  EstadoRecomendacion,
  "slate" | "blue" | "green" | "red"
> = {
  formulada: "slate",
  en_proceso: "blue",
  adoptada: "green",
  descartada: "red",
};

const alcanceLabel: Record<AlcanceRecomendacion, string> = {
  local: "Local",
  provincial: "Provincial",
  autonomico: "Autonómico",
  estatal: "Estatal",
  pluriautonomico: "Pluriautonómico",
};

// Orden canónico para los grupos
const ESTADO_ORDER: EstadoRecomendacion[] = [
  "formulada",
  "en_proceso",
  "adoptada",
  "descartada",
];
const ALCANCE_ORDER: AlcanceRecomendacion[] = [
  "local",
  "provincial",
  "autonomico",
  "estatal",
  "pluriautonomico",
];

type GroupBy = "none" | "estado" | "alcance";

// =============================================================================
// Componente principal
// =============================================================================

export function StrategicRecommendations() {
  const { selectedMisionId, selectedMision } = useMission();
  const [items, setItems] = useState<RecomendacionLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>("estado");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRecomendacionesEstrategicas(selectedMisionId).then((data) => {
      if (cancelled) return;
      setItems(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMisionId]);

  // ---------------------------------------------------------------------------
  // Agrupación
  // ---------------------------------------------------------------------------
  const groups = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", items }];
    }

    const map = new Map<string, RecomendacionLite[]>();
    for (const item of items) {
      const key =
        groupBy === "estado"
          ? (item.estado ?? "_sin")
          : (item.alcance ?? "_sin");
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }

    // Ordena por orden canónico, los "_sin" al final
    const order = groupBy === "estado" ? ESTADO_ORDER : ALCANCE_ORDER;
    const ordered: { key: string; label: string; items: RecomendacionLite[] }[] = [];
    for (const k of order) {
      if (map.has(k)) {
        ordered.push({
          key: k,
          label:
            groupBy === "estado"
              ? estadoLabel[k as EstadoRecomendacion]
              : alcanceLabel[k as AlcanceRecomendacion],
          items: map.get(k)!,
        });
      }
    }
    if (map.has("_sin")) {
      ordered.push({ key: "_sin", label: "Sin definir", items: map.get("_sin")! });
    }
    return ordered;
  }, [items, groupBy]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">
            Recomendaciones estratégicas
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Recomendaciones derivadas de los hallazgos del ecosistema
            {selectedMision && (
              <span> · {selectedMision.nombre}</span>
            )}
            .
          </p>
        </div>
        <GroupSwitcher value={groupBy} onChange={setGroupBy} />
      </header>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No hay recomendaciones todavía"
          description={
            selectedMision
              ? "Esta misión aún no genera recomendaciones."
              : "Crea recomendaciones a partir de los hallazgos."
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.key}>
              {g.label && (
                <header className="mb-1.5 flex items-center gap-2">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {g.label}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    · {g.items.length}
                  </span>
                </header>
              )}
              <ul className="space-y-1.5">
                {g.items.map((rec) => (
                  <RecRow key={rec.id} rec={rec} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// GroupSwitcher (toggle compacto)
// =============================================================================

function GroupSwitcher({
  value,
  onChange,
}: {
  value: GroupBy;
  onChange: (v: GroupBy) => void;
}) {
  const options: { value: GroupBy; label: string; icon: typeof List }[] = [
    { value: "none", label: "Lista", icon: List },
    { value: "estado", label: "Estado", icon: LayoutGrid },
    { value: "alcance", label: "Alcance", icon: LayoutGrid },
  ];
  return (
    <div
      role="tablist"
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded px-2 py-1 text-[11px] font-medium transition-colors",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Fila de recomendación
// =============================================================================

function RecRow({ rec }: { rec: RecomendacionLite }) {
  return (
    <li>
      <Link
        href="/dashboard/recomendaciones"
        className="group block rounded-md border border-slate-200 px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-slate-900">
                {rec.titulo}
              </p>
              {rec.estado && (
                <Badge tone={estadoTone[rec.estado]}>
                  {estadoLabel[rec.estado]}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
              {rec.descripcion}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {rec.alcance && (
                <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                  {alcanceLabel[rec.alcance]}
                </span>
              )}
              {rec.ambito?.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700"
                >
                  {a}
                </span>
              ))}
              {rec.hallazgos_count > 0 && (
                <span className="text-[10px] text-slate-400">
                  · {rec.hallazgos_count} hallazgo
                  {rec.hallazgos_count === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
          <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </Link>
    </li>
  );
}
