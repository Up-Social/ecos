"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Mision } from "@/lib/supabase/types";

export const misionesColumns: ColumnDef<Mision>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium text-slate-900">{row.original.nombre}</span>
    ),
  },
  {
    accessorKey: "problema",
    header: "Problema",
    cell: ({ row }) =>
      row.original.problema ? (
        <span className="line-clamp-1 text-slate-700">{row.original.problema}</span>
      ) : (
        <span className="text-slate-400">—</span>
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
];
