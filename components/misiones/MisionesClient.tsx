"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DataTable } from "@/components/data-table/DataTable";
import { useEntityActions } from "@/lib/hooks/useEntityActions";
import { useMission } from "@/lib/contexts/MissionContext";
import { misionesColumns } from "./columns";
import { MisionDrawer } from "./MisionDrawer";
import {
  getMisiones,
  createMision,
  updateMision,
  deleteMision,
} from "@/lib/queries/misiones";
import type { Mision } from "@/lib/supabase/types";
import type { MisionFormValues } from "@/lib/schemas/mision";

export function MisionesClient() {
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Mision | null>(null);
  const { refreshMisiones } = useMission();

  const fetchMisiones = useCallback(async () => {
    setLoading(true);
    const { data } = await getMisiones();
    setMisiones((data as Mision[] | null) ?? []);
    setLoading(false);
    // Mantén el dropdown global sincronizado con los cambios locales
    refreshMisiones();
  }, [refreshMisiones]);

  useEffect(() => {
    fetchMisiones();
  }, [fetchMisiones]);

  const { submit, remove, submitting } = useEntityActions<MisionFormValues, Mision>({
    entity: "misión",
    entityWithArticle: "la misión",
    create: createMision,
    update: updateMision,
    remove: deleteMision,
    getName: (m) => m.nombre,
    refresh: fetchMisiones,
  });

  async function handleSubmit(values: MisionFormValues) {
    await submit(values, editing, closeDrawer);
  }
  async function handleDelete() {
    if (editing) await remove(editing, closeDrawer);
  }

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(m: Mision) {
    setEditing(m);
    setDrawerOpen(true);
  }
  function closeDrawer() {
    setDrawerOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Misiones</h1>
          <p className="mt-1 text-sm text-slate-500">
            Define los grandes objetivos estratégicos del sistema ECOS.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva misión
        </Button>
      </div>

      {loading ? (
        <TableSkeleton columns={3} />
      ) : misiones.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No hay misiones todavía"
          description="Define el primer objetivo estratégico del ecosistema."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nueva misión
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={misionesColumns}
          data={misiones}
          searchKey="nombre"
          searchPlaceholder="Buscar misiones…"
          onRowClick={openEdit}
          emptyMessage="Sin resultados."
        />
      )}

      <MisionDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        mision={editing}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
        submitting={submitting}
      />
    </div>
  );
}
