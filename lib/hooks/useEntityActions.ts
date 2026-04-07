import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface EntityActionsConfig<TValues, TEntity> {
  /** Nombre singular para los mensajes (ej: "agente"). */
  entity: string;
  /** Nombre singular con artículo (ej: "el agente"). */
  entityWithArticle: string;
  create: (values: TValues) => Promise<{ error: { message: string } | null }>;
  update: (
    id: string,
    values: TValues,
  ) => Promise<{ error: { message: string } | null }>;
  remove: (id: string) => Promise<{ error: { message: string } | null }>;
  /** Cómo extraer un nombre legible para los mensajes de confirm/toast. */
  getName?: (entity: TEntity) => string;
  /** Recarga la lista tras cualquier mutación. */
  refresh: () => Promise<void>;
}

/**
 * Encapsula el patrón submit/delete con toasts y confirm dialog reutilizable.
 * Devuelve los handlers ya conectados a los providers globales.
 */
export function useEntityActions<TValues, TEntity extends { id: string }>(
  config: EntityActionsConfig<TValues, TEntity>,
) {
  const toast = useToast();
  const confirm = useConfirm();
  const [submitting, setSubmitting] = useState(false);

  async function submit(
    values: TValues,
    editing: TEntity | null,
    onSuccess?: () => void,
  ) {
    setSubmitting(true);
    try {
      const { error } = editing
        ? await config.update(editing.id, values)
        : await config.create(values);
      if (error) throw error;
      toast.success(
        editing
          ? `${capitalize(config.entity)} actualizado`
          : `${capitalize(config.entity)} creado`,
      );
      await config.refresh();
      onSuccess?.();
    } catch (e: any) {
      toast.error("Error al guardar", e?.message ?? "Inténtalo de nuevo");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(entity: TEntity, onSuccess?: () => void) {
    const name = config.getName?.(entity);
    const ok = await confirm({
      title: `Eliminar ${config.entityWithArticle}`,
      description: name
        ? `¿Seguro que quieres eliminar "${name}"? Esta acción no se puede deshacer.`
        : "Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const { error } = await config.remove(entity.id);
      if (error) throw error;
      toast.success(`${capitalize(config.entity)} eliminado`);
      await config.refresh();
      onSuccess?.();
    } catch (e: any) {
      toast.error("Error al eliminar", e?.message ?? "Inténtalo de nuevo");
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, remove, submitting };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
