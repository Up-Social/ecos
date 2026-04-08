"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/Badge";
import { ROLE_LABELS, type RoleKey } from "@/lib/auth/roles";
import type { Usuario } from "@/lib/queries/usuarios";

const roleTone: Record<RoleKey, "purple" | "blue" | "slate"> = {
  superadmin: "purple",
  gestor: "blue",
  usuario: "slate",
};

export const usuariosColumns: ColumnDef<Usuario>[] = [
  {
    id: "nombre_completo",
    header: "Nombre y apellidos",
    meta: { width: "30%" },
    accessorFn: (row) =>
      `${row.nombre ?? ""} ${row.apellidos ?? ""}`.trim() || "—",
    cell: ({ row }) => {
      const nombre = row.original.nombre ?? "";
      const apellidos = row.original.apellidos ?? "";
      const full = `${nombre} ${apellidos}`.trim();
      return (
        <span className="block whitespace-normal break-words font-medium text-slate-900">
          {full || <span className="text-slate-400">—</span>}
        </span>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    meta: { width: "30%" },
    cell: ({ row }) =>
      row.original.email ? (
        <span className="text-slate-700">{row.original.email}</span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    id: "roles",
    header: "Roles",
    meta: { width: "25%" },
    cell: ({ row }) => {
      const roles = row.original.roles;
      if (!roles || roles.length === 0) {
        return <span className="text-slate-400">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {roles.map((r) => (
            <Badge key={r} tone={roleTone[r]}>
              {ROLE_LABELS[r]}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "disabled",
    header: "Estado",
    meta: { width: "15%" },
    cell: ({ row }) =>
      row.original.disabled ? (
        <Badge tone="red">Deshabilitado</Badge>
      ) : (
        <Badge tone="green">Activo</Badge>
      ),
  },
];
