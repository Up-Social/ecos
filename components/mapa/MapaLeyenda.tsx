"use client";

import { cn } from "@/lib/utils";
import {
  MAPA_TIPOS,
  MAPA_TIPO_COLORS,
  MAPA_TIPO_LABELS,
  type MapaFiltros,
} from "@/lib/mapa/filtrar";
import type { MapaTipo } from "@/lib/queries/mapa";

// =============================================================================
// MapaLeyenda — leyenda de colores con toggle de visibilidad por tipo y el
// conteo de elementos visibles de cada tipo. Por defecto ambos tipos activos.
// =============================================================================

interface Props {
  tipos: MapaFiltros["tipos"];
  conteos: Record<MapaTipo, number>;
  onToggle: (tipo: MapaTipo) => void;
}

export function MapaLeyenda({ tipos, conteos, onToggle }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {MAPA_TIPOS.map((tipo) => {
        const activo = tipos.includes(tipo);
        return (
          <button
            key={tipo}
            type="button"
            onClick={() => onToggle(tipo)}
            aria-pressed={activo}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              activo
                ? "border-slate-300 bg-white text-slate-700"
                : "border-slate-200 bg-slate-50 text-slate-400",
            )}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                background: activo ? MAPA_TIPO_COLORS[tipo] : "#cbd5e1",
              }}
            />
            {MAPA_TIPO_LABELS[tipo]}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                activo ? "bg-slate-100 text-slate-600" : "bg-slate-100 text-slate-400",
              )}
            >
              {conteos[tipo]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
