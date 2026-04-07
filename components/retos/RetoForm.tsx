"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Button } from "@/components/ui/Button";
import { retoSchema, type RetoFormValues } from "@/lib/schemas/reto";
import type { RetoConRelaciones, Mision } from "@/lib/supabase/types";

interface Props {
  reto?: RetoConRelaciones | null;
  misiones: Pick<Mision, "id" | "nombre">[];
  onSubmit: (values: RetoFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export function RetoForm({
  reto,
  misiones,
  onSubmit,
  onDelete,
  onCancel,
  submitting,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RetoFormValues>({
    resolver: zodResolver(retoSchema),
    defaultValues: { nombre: "", descripcion: "", misiones_ids: [] },
  });

  useEffect(() => {
    if (reto) {
      reset({
        nombre: reto.nombre,
        descripcion: reto.descripcion ?? "",
        misiones_ids: reto.misiones.map((m) => m.id),
      });
    } else {
      reset({ nombre: "", descripcion: "", misiones_ids: [] });
    }
  }, [reto, reset]);

  const misionesOptions = misiones.map((m) => ({
    value: m.id,
    label: m.nombre,
  }));

  async function handleDelete() {
    if (onDelete) await onDelete();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Nombre" required error={errors.nombre?.message}>
        <Input {...register("nombre")} placeholder="Nombre del reto" />
      </Field>

      <Field label="Descripción">
        <Textarea
          {...register("descripcion")}
          placeholder="¿En qué consiste el reto?"
        />
      </Field>

      <Field label="Misiones vinculadas">
        <Controller
          name="misiones_ids"
          control={control}
          render={({ field }) => (
            <MultiSelect
              options={misionesOptions}
              value={field.value ?? []}
              onChange={field.onChange}
              placeholder="Asociar misiones"
            />
          )}
        />
      </Field>

      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {reto && onDelete && (
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
            {submitting ? "Guardando…" : reto ? "Guardar cambios" : "Crear reto"}
          </Button>
        </div>
      </div>
    </form>
  );
}
