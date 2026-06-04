"use client";

import { RotateCcw } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type {
  DimensionRelacional,
  MapaFacetas,
  MapaFiltros as MapaFiltrosState,
} from "@/lib/mapa/filtrar";

// =============================================================================
// MapaFiltros — selectores restrictivos en cascada (Misión, Reto, Proyecto,
// Agente, Territorio) + botón de reset. Las opciones llegan ya acotadas según
// el resto de la selección (las calcula el orquestador con calcularFacetas).
// =============================================================================

interface Props {
  facetas: MapaFacetas;
  filtros: MapaFiltrosState;
  onCambiar: (dim: DimensionRelacional, value: string | null) => void;
  onReset: () => void;
  hayFiltros: boolean;
}

const CAMPOS: {
  dim: DimensionRelacional;
  label: string;
  key: keyof MapaFacetas;
}[] = [
  { dim: "misionId", label: "Misión", key: "misiones" },
  { dim: "retoId", label: "Reto", key: "retos" },
  { dim: "proyectoId", label: "Proyecto", key: "proyectos" },
  { dim: "agenteId", label: "Agente", key: "agentes" },
  { dim: "ubicacionId", label: "Ubicación", key: "ubicaciones" },
];

export function MapaFiltros({
  facetas,
  filtros,
  onCambiar,
  onReset,
  hayFiltros,
}: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CAMPOS.map(({ dim, label, key }) => (
          <label key={dim} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              {label}
            </span>
            <Select
              value={(filtros[dim] as string | null) ?? ""}
              placeholder={`Todas · ${label.toLowerCase()}`}
              options={facetas[key]}
              onChange={(e) => onCambiar(dim, e.target.value || null)}
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!hayFiltros}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restablecer filtros
        </Button>
      </div>
    </div>
  );
}
