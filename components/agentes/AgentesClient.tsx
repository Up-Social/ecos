"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
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
import { agentesColumns } from "./columns";
import { AgenteDrawer } from "./AgenteDrawer";
import {
  getAgentes,
  createAgente,
  updateAgente,
  deleteAgente,
} from "@/lib/queries/agentes";
import type { Agente } from "@/lib/supabase/types";
import type { AgenteFormValues } from "@/lib/schemas/agente";

const TIPO_OPTIONS = [
  { value: "sociedad_civil", label: "Sociedad civil" },
  { value: "sector_publico", label: "Sector público" },
  { value: "academia", label: "Academia" },
  { value: "sector_privado", label: "Sector privado" },
];

export function AgentesClient() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Agente | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchAgentes = useCallback(async () => {
    setLoading(true);
    const { data } = await getAgentes();
    setAgentes((data as Agente[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgentes();
  }, [fetchAgentes]);

  // ---------------------------------------------------------------------------
  // Acciones (CRUD con toasts + confirm dialog)
  // ---------------------------------------------------------------------------
  const { submit, remove, submitting } = useEntityActions<
    AgenteFormValues,
    Agente
  >({
    entity: "agente",
    entityWithArticle: "el agente",
    create: createAgente,
    update: updateAgente,
    remove: deleteAgente,
    getName: (a) => a.nombre,
    refresh: fetchAgentes,
  });

  async function handleSubmit(values: AgenteFormValues) {
    await submit(values, editing, closeDrawer);
  }

  async function handleDelete() {
    if (!editing) return;
    await remove(editing, closeDrawer);
  }

  // ---------------------------------------------------------------------------
  // Filtros
  // ---------------------------------------------------------------------------
  const filters = useMemo<FilterDef<Agente>[]>(
    () => [
      {
        id: "tipo_agente",
        label: "Tipo",
        options: TIPO_OPTIONS,
        predicate: (row, v) => row.tipo_agente === v,
      },
    ],
    [],
  );

  const filteredAgentes = useFilteredData(agentes, filters, filterValues);
  const hasFilters = Object.values(filterValues).some(Boolean);

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------
  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(a: Agente) {
    setEditing(a);
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
          <h1 className="text-2xl font-semibold text-slate-900">Agentes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Organizaciones y entidades del ecosistema ECOS.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo agente
        </Button>
      </div>

      {loading ? (
        <TableSkeleton columns={4} />
      ) : agentes.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay agentes todavía"
          description="Crea el primer agente para empezar a construir tu ecosistema."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo agente
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={agentesColumns}
          data={filteredAgentes}
          searchKey="nombre"
          searchPlaceholder="Buscar agentes…"
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

      <AgenteDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        agente={editing}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
        submitting={submitting}
      />
    </div>
  );
}
