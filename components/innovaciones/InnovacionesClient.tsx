"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Lightbulb } from "lucide-react";
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
import { innovacionesColumns } from "./columns";
import { InnovacionDrawer } from "./InnovacionDrawer";
import {
  getInnovaciones,
  createInnovacion,
  updateInnovacion,
  deleteInnovacion,
} from "@/lib/queries/innovaciones";
import { getProyectosLite } from "@/lib/queries/proyectos";
import { getRetosLite } from "@/lib/queries/retos";
import type {
  InnovacionConRelaciones,
  Proyecto,
  Reto,
} from "@/lib/supabase/types";
import type { InnovacionFormValues } from "@/lib/schemas/innovacion";

const ESTADO_OPTIONS = [
  { value: "diseno", label: "Diseño" },
  { value: "prototipo", label: "Prototipo" },
  { value: "implementacion", label: "Implementación" },
  { value: "testeado", label: "Testeado" },
  { value: "escalado", label: "Escalado" },
];

const IMPACTO_OPTIONS = [
  { value: "comunitaria", label: "Comunitaria" },
  { value: "local", label: "Local" },
  { value: "autonomica", label: "Autonómica" },
  { value: "estatal", label: "Estatal" },
  { value: "internacional", label: "Internacional" },
];

export function InnovacionesClient() {
  const [innovaciones, setInnovaciones] = useState<InnovacionConRelaciones[]>([]);
  const [proyectos, setProyectos] = useState<Pick<Proyecto, "id" | "nombre">[]>(
    [],
  );
  const [retos, setRetos] = useState<Pick<Reto, "id" | "nombre">[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<InnovacionConRelaciones | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const { selectedMisionId } = useMission();

  const fetchInnovaciones = useCallback(async () => {
    setLoading(true);
    const { data } = await getInnovaciones({ misionId: selectedMisionId });
    setInnovaciones(data ?? []);
    setLoading(false);
  }, [selectedMisionId]);

  const fetchProyectos = useCallback(async () => {
    const { data } = await getProyectosLite();
    if (data) setProyectos(data);
  }, []);

  const fetchRetos = useCallback(async () => {
    const { data } = await getRetosLite();
    if (data) setRetos(data);
  }, []);

  useEffect(() => {
    fetchInnovaciones();
    fetchProyectos();
    fetchRetos();
  }, [fetchInnovaciones, fetchProyectos, fetchRetos]);

  const { submit, remove, submitting } = useEntityActions<
    InnovacionFormValues,
    InnovacionConRelaciones
  >({
    entity: "innovación",
    entityWithArticle: "la innovación",
    create: createInnovacion,
    update: updateInnovacion,
    remove: deleteInnovacion,
    getName: (i) => i.nombre,
    refresh: fetchInnovaciones,
  });

  async function handleSubmit(values: InnovacionFormValues) {
    await submit(values, editing, closeDrawer);
  }
  async function handleDelete() {
    if (editing) await remove(editing, closeDrawer);
  }

  const filters = useMemo<FilterDef<InnovacionConRelaciones>[]>(
    () => [
      {
        id: "estado",
        label: "Estado",
        options: ESTADO_OPTIONS,
        predicate: (row, v) => row.estado === v,
      },
      {
        id: "nivel_impacto",
        label: "Impacto",
        options: IMPACTO_OPTIONS,
        predicate: (row, v) => row.nivel_impacto === v,
      },
      {
        id: "proyecto",
        label: "Proyecto",
        options: proyectos.map((p) => ({ value: p.id, label: p.nombre })),
        predicate: (row, v) => row.proyecto_id === v,
      },
      {
        id: "reto",
        label: "Reto",
        options: retos.map((r) => ({ value: r.id, label: r.nombre })),
        predicate: (row, v) => row.retos.some((r) => r.id === v),
      },
    ],
    [proyectos, retos],
  );

  const filteredInnovaciones = useFilteredData(
    innovaciones,
    filters,
    filterValues,
  );
  const hasFilters = Object.values(filterValues).some(Boolean);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(inn: InnovacionConRelaciones) {
    setEditing(inn);
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
          <h1 className="text-2xl font-semibold text-slate-900">Innovaciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            Innovaciones generadas dentro de cada proyecto.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva innovación
        </Button>
      </div>

      {loading ? (
        <TableSkeleton columns={5} />
      ) : innovaciones.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No hay innovaciones todavía"
          description="Las innovaciones se generan a partir de los proyectos."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nueva innovación
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={innovacionesColumns}
          data={filteredInnovaciones}
          searchKey="nombre"
          searchPlaceholder="Buscar innovaciones…"
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

      <InnovacionDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        innovacion={editing}
        proyectos={proyectos}
        retos={retos}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
        submitting={submitting}
      />
    </div>
  );
}
