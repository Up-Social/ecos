"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { misionSchema, type MisionFormValues } from "@/lib/schemas/mision";
import type { Mision } from "@/lib/supabase/types";

interface Props {
  mision?: Mision | null;
  onSubmit: (values: MisionFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export function MisionForm({
  mision,
  onSubmit,
  onDelete,
  onCancel,
  submitting,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MisionFormValues>({
    resolver: zodResolver(misionSchema),
    defaultValues: { nombre: "", descripcion: "", problema: "" },
  });

  useEffect(() => {
    if (mision) {
      reset({
        nombre: mision.nombre,
        descripcion: mision.descripcion ?? "",
        problema: mision.problema ?? "",
      });
    } else {
      reset({ nombre: "", descripcion: "", problema: "" });
    }
  }, [mision, reset]);

  async function handleDelete() {
    if (onDelete) await onDelete();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Nombre" required error={errors.nombre?.message}>
        <Input {...register("nombre")} placeholder="Nombre de la misión" />
      </Field>

      <Field label="Problema">
        <Textarea
          {...register("problema")}
          placeholder="¿Qué problema busca abordar esta misión?"
        />
      </Field>

      <Field label="Descripción">
        <Textarea
          {...register("descripcion")}
          placeholder="Descripción ampliada de la misión"
        />
      </Field>

      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {mision && onDelete && (
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
            {submitting ? "Guardando…" : mision ? "Guardar cambios" : "Crear misión"}
          </Button>
        </div>
      </div>
    </form>
  );
}
