"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Microscope } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DataTable } from "@/components/data-table/DataTable";
import { useEntityActions } from "@/lib/hooks/useEntityActions";
import { hallazgosColumns } from "./columns";
import { HallazgoDrawer } from "./HallazgoDrawer";
import {
  getHallazgos,
  createHallazgo,
  updateHallazgo,
  deleteHallazgo,
} from "@/lib/queries/hallazgos";
import { getInnovacionesLite } from "@/lib/queries/innovaciones";
import type { HallazgoConRelaciones, Innovacion } from "@/lib/supabase/types";
import type { HallazgoFormValues } from "@/lib/schemas/hallazgo";

export function HallazgosClient() {
  const [hallazgos, setHallazgos] = useState<HallazgoConRelaciones[]>([]);
  const [innovaciones, setInnovaciones] = useState<
    Pick<Innovacion, "id" | "nombre">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<HallazgoConRelaciones | null>(null);

  const fetchHallazgos = useCallback(async () => {
    setLoading(true);
    const { data } = await getHallazgos();
    setHallazgos((data as HallazgoConRelaciones[] | null) ?? []);
    setLoading(false);
  }, []);

  const fetchInnovaciones = useCallback(async () => {
    const { data } = await getInnovacionesLite();
    if (data) setInnovaciones(data);
  }, []);

  useEffect(() => {
    fetchHallazgos();
    fetchInnovaciones();
  }, [fetchHallazgos, fetchInnovaciones]);

  const { submit, remove, submitting } = useEntityActions<
    HallazgoFormValues,
    HallazgoConRelaciones
  >({
    entity: "hallazgo",
    entityWithArticle: "el hallazgo",
    create: createHallazgo,
    update: updateHallazgo,
    remove: deleteHallazgo,
    getName: (h) => h.titulo,
    refresh: fetchHallazgos,
  });

  async function handleSubmit(values: HallazgoFormValues) {
    await submit(values, editing, closeDrawer);
  }
  async function handleDelete() {
    if (editing) await remove(editing, closeDrawer);
  }

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(h: HallazgoConRelaciones) {
    setEditing(h);
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
          <h1 className="text-2xl font-semibold text-slate-900">Hallazgos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Evidencias y aprendizajes derivados de las innovaciones.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo hallazgo
        </Button>
      </div>

      {loading ? (
        <TableSkeleton columns={4} />
      ) : hallazgos.length === 0 ? (
        <EmptyState
          icon={Microscope}
          title="No hay hallazgos todavía"
          description="Documenta evidencias y aprendizajes de las innovaciones."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo hallazgo
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={hallazgosColumns}
          data={hallazgos}
          searchKey="titulo"
          searchPlaceholder="Buscar hallazgos…"
          onRowClick={openEdit}
          emptyMessage="Sin resultados."
        />
      )}

      <HallazgoDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        hallazgo={editing}
        innovaciones={innovaciones}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
        submitting={submitting}
      />
    </div>
  );
}
