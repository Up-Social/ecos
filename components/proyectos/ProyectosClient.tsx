"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, FolderKanban } from "lucide-react";
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
import { proyectosColumns } from "./columns";
import { ProyectoDrawer } from "./ProyectoDrawer";
import {
  getProyectos,
  createProyecto,
  updateProyecto,
  deleteProyecto,
} from "@/lib/queries/proyectos";
import { getAgentesLite } from "@/lib/queries/agentes";
import type { ProyectoConLider, Agente } from "@/lib/supabase/types";
import type { ProyectoFormValues } from "@/lib/schemas/proyecto";

const ESTADO_OPTIONS = [
  { value: "diseno", label: "Diseño" },
  { value: "activo", label: "Activo" },
  { value: "finalizado", label: "Finalizado" },
  { value: "escalado", label: "Escalado" },
];

export function ProyectosClient() {
  const [proyectos, setProyectos] = useState<ProyectoConLider[]>([]);
  const [agentes, setAgentes] = useState<Pick<Agente, "id" | "nombre" | "email">[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProyectoConLider | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const { selectedMisionId } = useMission();

  // ---------------------------------------------------------------------------
  // Fetch — depende de la misión global; refetch automático al cambiar
  // ---------------------------------------------------------------------------
  const fetchProyectos = useCallback(async () => {
    setLoading(true);
    const { data } = await getProyectos({ misionId: selectedMisionId });
    setProyectos(data ?? []);
    setLoading(false);
  }, [selectedMisionId]);

  const fetchAgentes = useCallback(async () => {
    const { data } = await getAgentesLite();
    if (data) setAgentes(data);
  }, []);

  useEffect(() => {
    fetchProyectos();
    fetchAgentes();
  }, [fetchProyectos, fetchAgentes]);

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------
  const { submit, remove, submitting } = useEntityActions<
    ProyectoFormValues,
    ProyectoConLider
  >({
    entity: "proyecto",
    entityWithArticle: "el proyecto",
    create: createProyecto,
    update: updateProyecto,
    remove: deleteProyecto,
    getName: (p) => p.nombre,
    refresh: fetchProyectos,
  });

  async function handleSubmit(values: ProyectoFormValues) {
    await submit(values, editing, closeDrawer);
  }
  async function handleDelete() {
    if (editing) await remove(editing, closeDrawer);
  }

  // ---------------------------------------------------------------------------
  // Filtros
  // ---------------------------------------------------------------------------
  const filters = useMemo<FilterDef<ProyectoConLider>[]>(
    () => [
      {
        id: "estado",
        label: "Estado",
        options: ESTADO_OPTIONS,
        predicate: (row, v) => row.estado === v,
      },
      {
        id: "agente_lider",
        label: "Líder",
        options: agentes.map((a) => ({ value: a.id, label: a.nombre })),
        predicate: (row, v) => row.agente_lider_id === v,
      },
    ],
    [agentes],
  );

  const filteredProyectos = useFilteredData(proyectos, filters, filterValues);
  const hasFilters = Object.values(filterValues).some(Boolean);

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(proyecto: ProyectoConLider) {
    setEditing(proyecto);
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
          <h1 className="text-2xl font-semibold text-slate-900">Proyectos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona los proyectos del ecosistema y su agente líder.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo proyecto
        </Button>
      </div>

      {loading ? (
        <TableSkeleton columns={3} />
      ) : proyectos.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No hay proyectos todavía"
          description="Crea el primer proyecto para empezar."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo proyecto
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={proyectosColumns}
          data={filteredProyectos}
          searchKey="nombre"
          searchPlaceholder="Buscar proyectos…"
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

      <ProyectoDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        proyecto={editing}
        agentes={agentes}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
        submitting={submitting}
      />
    </div>
  );
}
