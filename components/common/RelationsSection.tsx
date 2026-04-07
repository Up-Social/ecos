"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { DerivedItem } from "@/lib/queries/derived";

interface Group {
  label: string;
  items: DerivedItem[];
  /** Si true, los badges son informativos (no editables) */
  derived?: boolean;
  tone?: "slate" | "blue" | "green" | "amber" | "purple";
}

interface Props {
  groups: Group[];
  loading?: boolean;
  emptyMessage?: string;
}

/**
 * Sección reutilizable para mostrar relaciones (directas o derivadas)
 * de una entidad. Las derivadas llevan un icono ✨ para distinguirlas.
 */
export function RelationsSection({
  groups,
  loading,
  emptyMessage = "Sin relaciones",
}: Props) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-slate-900">Relaciones</h3>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400">Calculando…</p>
      ) : groups.every((g) => g.items.length === 0) ? (
        <p className="text-xs text-slate-400">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {g.label}
                {g.derived && (
                  <span className="ml-1 text-slate-400">(calculadas)</span>
                )}
              </p>
              {g.items.length === 0 ? (
                <p className="text-xs text-slate-400">—</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((item) => (
                    <Badge key={item.id} tone={g.tone ?? "slate"}>
                      {item.nombre}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
