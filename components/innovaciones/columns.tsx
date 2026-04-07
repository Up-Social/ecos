"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/Badge";
import type {
  InnovacionConRelaciones,
  EstadoInnovacion,
  NivelImpacto,
} from "@/lib/supabase/types";

const estadoTone: Record<
  EstadoInnovacion,
  "slate" | "blue" | "amber" | "green" | "purple"
> = {
  diseno: "slate",
  prototipo: "blue",
  implementacion: "amber",
  testeado: "green",
  escalado: "purple",
};

const estadoLabel: Record<EstadoInnovacion, string> = {
  diseno: "Diseño",
  prototipo: "Prototipo",
  implementacion: "Implementación",
  testeado: "Testeado",
  escalado: "Escalado",
};

const impactoLabel: Record<NivelImpacto, string> = {
  comunitaria: "Comunitaria",
  local: "Local",
  autonomica: "Autonómica",
  estatal: "Estatal",
  internacional: "Internacional",
};

export const innovacionesColumns: ColumnDef<InnovacionConRelaciones>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-slate-900">{row.original.nombre}</div>
        {row.original.descripcion && (
          <div className="line-clamp-1 text-xs text-slate-500">
            {row.original.descripcion}
          </div>
        )}
      </div>
    ),
  },
  {
    id: "proyecto",
    header: "Proyecto",
    cell: ({ row }) => (
      <span className="text-slate-700">
        {row.original.proyecto?.nombre ?? (
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
  {
    accessorKey: "nivel_impacto",
    header: "Impacto",
    cell: ({ row }) => {
      const i = row.original.nivel_impacto;
      return i ? (
        <span className="text-slate-700">{impactoLabel[i]}</span>
      ) : (
        <span className="text-slate-400">—</span>
      );
    },
  },
  {
    id: "retos",
    header: "Retos",
    cell: ({ row }) => {
      const n = row.original.retos.length;
      return n > 0 ? (
        <Badge tone="slate">{n}</Badge>
      ) : (
        <span className="text-slate-400">—</span>
      );
    },
  },
];
