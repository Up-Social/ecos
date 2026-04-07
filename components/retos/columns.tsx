"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/Badge";
import type { RetoConRelaciones } from "@/lib/supabase/types";

export const retosColumns: ColumnDef<RetoConRelaciones>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium text-slate-900">{row.original.nombre}</span>
    ),
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    cell: ({ row }) =>
      row.original.descripcion ? (
        <span className="line-clamp-1 text-slate-700">
          {row.original.descripcion}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    id: "misiones",
    header: "Misiones",
    cell: ({ row }) => {
      const n = row.original.misiones.length;
      return n > 0 ? (
        <Badge tone="slate">{n}</Badge>
      ) : (
        <span className="text-slate-400">—</span>
      );
    },
  },
];
