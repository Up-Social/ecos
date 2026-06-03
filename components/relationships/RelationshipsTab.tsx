"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/data-table/DataTable";
import { useEntityActions } from "@/lib/hooks/useEntityActions";
import { ENTITY_TYPE_LABELS, type RelationshipFormValues } from "@/lib/schemas/relationship";
import {
  getRelationshipsForEntity,
  getRelationshipTypes,
  getEntityOptions,
  createRelationship,
  updateRelationship,
  deleteRelationship,
} from "@/lib/queries/relationships";
import type {
  EntityType,
  RelationshipConTipo,
  RelationshipType,
} from "@/lib/supabase/types";
import { RelationshipForm } from "./RelationshipForm";

interface Props {
  entityType: EntityType;
  entityId: string;
}

// Fila enriquecida para la tabla: resuelve la "otra" entidad y la dirección.
interface Row extends RelationshipConTipo {
  direction: "saliente" | "entrante";
  otherType: EntityType;
  otherLabel: string;
}

export function RelationshipsTab({ entityType, entityId }: Props) {
  const [relationships, setRelationships] = useState<RelationshipConTipo[]>([]);
  const [types, setTypes] = useState<RelationshipType[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RelationshipConTipo | null>(null);

  // ---------------------------------------------------------------------------
  // Carga: relaciones de la entidad + catálogo de tipos
  // ---------------------------------------------------------------------------
  const fetchRelationships = useCallback(async () => {
    setLoading(true);
    const { data } = await getRelationshipsForEntity(entityType, entityId);
    setRelationships(data ?? []);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  useEffect(() => {
    let cancelled = false;
    getRelationshipTypes({ onlyActive: true }).then(({ data }) => {
      if (!cancelled) setTypes(data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolver nombres de las entidades "del otro lado" (cache por tipo).
  useEffect(() => {
    const otherTypes = new Set<EntityType>();
    for (const r of relationships) {
      const isSource =
        r.source_entity_type === entityType && r.source_entity_id === entityId;
      otherTypes.add(isSource ? r.target_entity_type : r.source_entity_type);
    }
    if (otherTypes.size === 0) return;
    let cancelled = false;
    Promise.all(
      Array.from(otherTypes).map((t) =>
        getEntityOptions(t).then(({ data }) => ({ t, data })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const { t, data } of results) {
        for (const o of data) map[`${t}:${o.id}`] = o.label;
      }
      setLabels(map);
    });
    return () => {
      cancelled = true;
    };
  }, [relationships, entityType, entityId]);

  // ---------------------------------------------------------------------------
  // Acciones (crear / editar / eliminar) con toast + confirm
  // ---------------------------------------------------------------------------
  const actions = useEntityActions<RelationshipFormValues, RelationshipConTipo>({
    entity: "relación",
    entityWithArticle: "la relación",
    create: (values) => createRelationship(values),
    update: (id, values) => updateRelationship(id, values),
    remove: (id) => deleteRelationship(id),
    getName: (r) => r.relationship_type?.name ?? "relación",
    refresh: fetchRelationships,
  });

  // ---------------------------------------------------------------------------
  // Filas enriquecidas
  // ---------------------------------------------------------------------------
  const rows: Row[] = useMemo(
    () =>
      relationships.map((r) => {
        const isSource =
          r.source_entity_type === entityType &&
          r.source_entity_id === entityId;
        const otherType = isSource
          ? r.target_entity_type
          : r.source_entity_type;
        const otherId = isSource ? r.target_entity_id : r.source_entity_id;
        return {
          ...r,
          direction: isSource ? "saliente" : "entrante",
          otherType,
          otherLabel: labels[`${otherType}:${otherId}`] ?? otherId,
        };
      }),
    [relationships, labels, entityType, entityId],
  );

  const columns: ColumnDef<Row>[] = useMemo(
    () => [
      {
        accessorKey: "relationship_type",
        header: "Tipo",
        meta: { width: "12rem" },
        cell: ({ row }) => (
          <span className="font-medium text-slate-900">
            {row.original.relationship_type?.name ?? "—"}
          </span>
        ),
      },
      {
        id: "direction",
        header: "Dirección",
        meta: { width: "7rem" },
        cell: ({ row }) =>
          row.original.direction === "saliente" ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <ArrowRight className="h-3 w-3" /> Hacia
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <ArrowLeft className="h-3 w-3" /> Desde
            </span>
          ),
      },
      {
        id: "other",
        header: "Entidad relacionada",
        cell: ({ row }) => (
          <span className="text-slate-700">
            <Badge tone="blue">{ENTITY_TYPE_LABELS[row.original.otherType]}</Badge>{" "}
            {row.original.otherLabel}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: "Descripción",
        meta: { width: "16rem" },
        cell: ({ row }) =>
          row.original.description ? (
            <span className="text-slate-600">{row.original.description}</span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
    ],
    [],
  );

  // ---------------------------------------------------------------------------
  // Handlers de formulario
  // ---------------------------------------------------------------------------
  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    setFormOpen(true);
  }

  async function handleSubmit(values: RelationshipFormValues) {
    await actions.submit(values, editing, () => setFormOpen(false));
  }

  async function handleDelete() {
    if (!editing) return;
    await actions.remove(editing, () => setFormOpen(false));
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (formOpen) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">
          {editing ? "Editar relación" : "Nueva relación"}
        </h3>
        <RelationshipForm
          sourceEntityType={entityType}
          sourceEntityId={entityId}
          relationshipTypes={types}
          relationship={editing}
          onSubmit={handleSubmit}
          onDelete={editing ? handleDelete : undefined}
          onCancel={() => setFormOpen(false)}
          submitting={actions.submitting}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Relaciones del grafo de conocimiento de esta entidad.
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Añadir relación
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400">Cargando relaciones…</p>
      ) : (
        <DataTable<Row>
          columns={columns as ColumnDef<Row, unknown>[]}
          data={rows}
          onRowClick={openEdit}
          emptyMessage="Esta entidad aún no tiene relaciones. Pulsa «Añadir relación» para crear una."
        />
      )}
    </div>
  );
}
