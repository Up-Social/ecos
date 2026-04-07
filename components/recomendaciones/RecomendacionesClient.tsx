"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DataTable } from "@/components/data-table/DataTable";
import { useEntityActions } from "@/lib/hooks/useEntityActions";
import { recomendacionesColumns } from "./columns";
import { RecomendacionDrawer } from "./RecomendacionDrawer";
import {
  getRecomendaciones,
  createRecomendacion,
  updateRecomendacion,
  deleteRecomendacion,
} from "@/lib/queries/recomendaciones";
import { getHallazgosLite } from "@/lib/queries/hallazgos";
import type {
  RecomendacionConRelaciones,
  Hallazgo,
} from "@/lib/supabase/types";
import type { RecomendacionFormValues } from "@/lib/schemas/recomendacion";

export function RecomendacionesClient() {
  const [recomendaciones, setRecomendaciones] = useState<
    RecomendacionConRelaciones[]
  >([]);
  const [hallazgos, setHallazgos] = useState<Pick<Hallazgo, "id" | "titulo">[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RecomendacionConRelaciones | null>(
    null,
  );

  const fetchRecomendaciones = useCallback(async () => {
    setLoading(true);
    const { data } = await getRecomendaciones();
    setRecomendaciones(data ?? []);
    setLoading(false);
  }, []);

  const fetchHallazgos = useCallback(async () => {
    const { data } = await getHallazgosLite();
    if (data) setHallazgos(data);
  }, []);

  useEffect(() => {
    fetchRecomendaciones();
    fetchHallazgos();
  }, [fetchRecomendaciones, fetchHallazgos]);

  const { submit, remove, submitting } = useEntityActions<
    RecomendacionFormValues,
    RecomendacionConRelaciones
  >({
    entity: "recomendación",
    entityWithArticle: "la recomendación",
    create: createRecomendacion,
    update: updateRecomendacion,
    remove: deleteRecomendacion,
    getName: (r) => r.titulo,
    refresh: fetchRecomendaciones,
  });

  async function handleSubmit(values: RecomendacionFormValues) {
    await submit(values, editing, closeDrawer);
  }
  async function handleDelete() {
    if (editing) await remove(editing, closeDrawer);
  }

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(r: RecomendacionConRelaciones) {
    setEditing(r);
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
          <h1 className="text-2xl font-semibold text-slate-900">
            Recomendaciones
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Recomendaciones de política basadas en hallazgos.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva recomendación
        </Button>
      </div>

      {loading ? (
        <TableSkeleton columns={4} />
      ) : recomendaciones.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No hay recomendaciones todavía"
          description="Crea recomendaciones de política a partir de los hallazgos."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nueva recomendación
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={recomendacionesColumns}
          data={recomendaciones}
          searchKey="titulo"
          searchPlaceholder="Buscar recomendaciones…"
          onRowClick={openEdit}
          emptyMessage="Sin resultados."
        />
      )}

      <RecomendacionDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        recomendacion={editing}
        hallazgos={hallazgos}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
        submitting={submitting}
      />
    </div>
  );
}
