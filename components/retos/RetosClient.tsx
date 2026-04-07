"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Flag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DataTable } from "@/components/data-table/DataTable";
import {
  FilterBar,
  type FilterDef,
  type FilterValues,
} from "@/components/data-table/FilterBar";
import { useFilteredData } from "@/lib/hooks/useFilteredData";
import { useEntityActions } from "@/lib/hooks/useEntityActions";
import { useMission } from "@/lib/contexts/MissionContext";
import { retosColumns } from "./columns";
import { RetoDrawer } from "./RetoDrawer";
import {
  getRetos,
  createReto,
  updateReto,
  deleteReto,
} from "@/lib/queries/retos";
import { getMisionesLite } from "@/lib/queries/misiones";
import type { RetoConRelaciones, Mision } from "@/lib/supabase/types";
import type { RetoFormValues } from "@/lib/schemas/reto";

export function RetosClient() {
  const [retos, setRetos] = useState<RetoConRelaciones[]>([]);
  const [misiones, setMisiones] = useState<Pick<Mision, "id" | "nombre">[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RetoConRelaciones | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const { selectedMisionId } = useMission();

  const fetchRetos = useCallback(async () => {
    setLoading(true);
    const { data } = await getRetos({ misionId: selectedMisionId });
    setRetos(data ?? []);
    setLoading(false);
  }, [selectedMisionId]);

  const fetchMisiones = useCallback(async () => {
    const { data } = await getMisionesLite();
    if (data) setMisiones(data);
  }, []);

  useEffect(() => {
    fetchRetos();
    fetchMisiones();
  }, [fetchRetos, fetchMisiones]);

  const { submit, remove, submitting } = useEntityActions<
    RetoFormValues,
    RetoConRelaciones
  >({
    entity: "reto",
    entityWithArticle: "el reto",
    create: createReto,
    update: updateReto,
    remove: deleteReto,
    getName: (r) => r.nombre,
    refresh: fetchRetos,
  });

  async function handleSubmit(values: RetoFormValues) {
    await submit(values, editing, closeDrawer);
  }
  async function handleDelete() {
    if (editing) await remove(editing, closeDrawer);
  }

  const filters = useMemo<FilterDef<RetoConRelaciones>[]>(
    () => [
      {
        id: "mision",
        label: "Misión",
        options: misiones.map((m) => ({ value: m.id, label: m.nombre })),
        predicate: (row, v) => row.misiones.some((m) => m.id === v),
      },
    ],
    [misiones],
  );

  const filteredRetos = useFilteredData(retos, filters, filterValues);
  const hasFilters = Object.values(filterValues).some(Boolean);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(r: RetoConRelaciones) {
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
          <h1 className="text-2xl font-semibold text-slate-900">Retos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Retos operativos vinculados a una o varias misiones.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo reto
        </Button>
      </div>

      {loading ? (
        <TableSkeleton columns={3} />
      ) : retos.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No hay retos todavía"
          description="Crea retos y vincúlalos a las misiones del ecosistema."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo reto
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={retosColumns}
          data={filteredRetos}
          searchKey="nombre"
          searchPlaceholder="Buscar retos…"
          onRowClick={openEdit}
          emptyMessage={
            hasFilters
              ? "Sin resultados con los filtros actuales."
              : "Sin resultados."
          }
          toolbar={
            <FilterBar
              filters={filters}
              values={filterValues}
              onChange={setFilterValues}
            />
          }
        />
      )}

      <RetoDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        reto={editing}
        misiones={misiones}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
        submitting={submitting}
      />
    </div>
  );
}
