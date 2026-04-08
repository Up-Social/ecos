"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/Badge";
import { ESTADO_PROYECTO_LABELS } from "@/lib/enums";
import type { ProyectoConLider, EstadoProyecto } from "@/lib/supabase/types";

const estadoTone: Record<EstadoProyecto, "slate" | "blue" | "green" | "purple"> = {
  en_diseno: "slate",
  activo: "blue",
  finalizado: "green",
  escalado: "purple",
};

const estadoLabel = ESTADO_PROYECTO_LABELS;

export const proyectosColumns: ColumnDef<ProyectoConLider>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-slate-900">{row.original.nombre}</div>
        {row.original.financiador && (
          <div className="text-xs text-slate-500">{row.original.financiador}</div>
        )}
      </div>
    ),
  },
  {
    id: "agente_lider",
    header: "Agente líder",
    cell: ({ row }) => (
      <span className="text-slate-700">
        {row.original.agente_lider?.nombre ?? (
          <span className="text-slate-400">—</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const e = row.original.estado;
      if (!e) return <span className="text-slate-400">—</span>;
      return <Badge tone={estadoTone[e]}>{estadoLabel[e]}</Badge>;
    },
  },
];
