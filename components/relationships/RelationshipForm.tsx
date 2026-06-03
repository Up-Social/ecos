"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  relationshipSchema,
  ENTITY_TYPES,
  ENTITY_TYPE_LABELS,
  type RelationshipFormValues,
} from "@/lib/schemas/relationship";
import { getEntityOptions, type EntityOption } from "@/lib/queries/relationships";
import type {
  EntityType,
  RelationshipConTipo,
  RelationshipType,
} from "@/lib/supabase/types";

interface Props {
  /** Entidad contenedora: origen fijo de la relación. */
  sourceEntityType: EntityType;
  sourceEntityId: string;
  /** Tipos de relación activos del catálogo. */
  relationshipTypes: RelationshipType[];
  /** Relación en edición, o null para alta. */
  relationship?: RelationshipConTipo | null;
  onSubmit: (values: RelationshipFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const entityTypeOptions = ENTITY_TYPES.map((t) => ({
  value: t,
  label: ENTITY_TYPE_LABELS[t],
}));

export function RelationshipForm({
  sourceEntityType,
  sourceEntityId,
  relationshipTypes,
  relationship,
  onSubmit,
  onDelete,
  onCancel,
  submitting,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<RelationshipFormValues>({
    resolver: zodResolver(relationshipSchema),
    defaultValues: {
      source_entity_type: sourceEntityType,
      source_entity_id: sourceEntityId,
      relationship_type_id: "",
      target_entity_type: "agentes",
      target_entity_id: "",
      description: "",
    },
  });

  useEffect(() => {
    if (relationship) {
      reset({
        source_entity_type: sourceEntityType,
        source_entity_id: sourceEntityId,
        relationship_type_id: relationship.relationship_type_id,
        target_entity_type: relationship.target_entity_type,
        target_entity_id: relationship.target_entity_id,
        description: relationship.description ?? "",
      });
    } else {
      reset({
        source_entity_type: sourceEntityType,
        source_entity_id: sourceEntityId,
        relationship_type_id: "",
        target_entity_type: "agentes",
        target_entity_id: "",
        description: "",
      });
    }
  }, [relationship, sourceEntityType, sourceEntityId, reset]);

  // Opciones de la entidad destino, recargadas al cambiar el tipo de destino.
  const targetType = watch("target_entity_type") as EntityType;
  const [targetOptions, setTargetOptions] = useState<EntityOption[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  useEffect(() => {
    if (!targetType) {
      setTargetOptions([]);
      return;
    }
    let cancelled = false;
    setLoadingTargets(true);
    getEntityOptions(targetType).then(({ data }) => {
      if (cancelled) return;
      // No permitir seleccionar la propia entidad de origen como destino.
      const filtered =
        targetType === sourceEntityType
          ? data.filter((o) => o.id !== sourceEntityId)
          : data;
      setTargetOptions(filtered);
      setLoadingTargets(false);
    });
    return () => {
      cancelled = true;
    };
  }, [targetType, sourceEntityType, sourceEntityId]);

  const typeOptions = relationshipTypes.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  async function handleDelete() {
    if (onDelete) await onDelete();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Tipo de relación" required error={errors.relationship_type_id?.message}>
        <Controller
          name="relationship_type_id"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              value={field.value ?? ""}
              options={typeOptions}
              placeholder="Selecciona un tipo de relación"
            />
          )}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo de entidad destino" error={errors.target_entity_type?.message}>
          <Controller
            name="target_entity_type"
            control={control}
            render={({ field }) => (
              <Select {...field} options={entityTypeOptions} />
            )}
          />
        </Field>
        <Field label="Entidad destino" required error={errors.target_entity_id?.message}>
          <Controller
            name="target_entity_id"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                value={field.value ?? ""}
                options={targetOptions.map((o) => ({
                  value: o.id,
                  label: o.label,
                }))}
                placeholder={
                  loadingTargets ? "Cargando…" : "Selecciona la entidad"
                }
                disabled={loadingTargets}
              />
            )}
          />
        </Field>
      </div>

      <Field label="Descripción">
        <Textarea
          {...register("description")}
          placeholder="Matiz o contexto de la relación (opcional)"
        />
      </Field>

      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {relationship && onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              className="text-red-600 hover:bg-red-50"
              disabled={submitting}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            {submitting
              ? "Guardando…"
              : relationship
                ? "Guardar cambios"
                : "Crear relación"}
          </Button>
        </div>
      </div>
    </form>
  );
}
