"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Button } from "@/components/ui/Button";
import {
  recomendacionSchema,
  type RecomendacionFormValues,
} from "@/lib/schemas/recomendacion";
import type { RecomendacionConRelaciones, Hallazgo } from "@/lib/supabase/types";

interface Props {
  recomendacion?: RecomendacionConRelaciones | null;
  hallazgos: Pick<Hallazgo, "id" | "titulo">[];
  onSubmit: (values: RecomendacionFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const alcanceOptions = [
  { value: "local", label: "Local" },
  { value: "provincial", label: "Provincial" },
  { value: "autonomico", label: "Autonómico" },
  { value: "estatal", label: "Estatal" },
  { value: "pluriautonomico", label: "Pluriautonómico" },
];

const estadoOptions = [
  { value: "formulada", label: "Formulada" },
  { value: "en_proceso", label: "En proceso" },
  { value: "adoptada", label: "Adoptada" },
  { value: "descartada", label: "Descartada" },
];

/** Convierte CSV "a, b, c" a string[] y viceversa para el input ámbito. */
function csvToArray(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function RecomendacionForm({
  recomendacion,
  hallazgos,
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
  } = useForm<RecomendacionFormValues>({
    resolver: zodResolver(recomendacionSchema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      ambito: [],
      destinatarios: "",
      alcance: null,
      estado: null,
      hallazgos_ids: [],
    },
  });

  useEffect(() => {
    if (recomendacion) {
      reset({
        titulo: recomendacion.titulo,
        descripcion: recomendacion.descripcion,
        ambito: recomendacion.ambito ?? [],
        destinatarios: recomendacion.destinatarios ?? "",
        alcance: recomendacion.alcance,
        estado: recomendacion.estado,
        hallazgos_ids: recomendacion.hallazgos.map((h) => h.id),
      });
    } else {
      reset({
        titulo: "",
        descripcion: "",
        ambito: [],
        destinatarios: "",
        alcance: null,
        estado: null,
        hallazgos_ids: [],
      });
    }
  }, [recomendacion, reset]);

  const hallazgosOptions = hallazgos.map((h) => ({
    value: h.id,
    label: h.titulo,
  }));

  async function handleDelete() {
    if (onDelete) await onDelete();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Título" required error={errors.titulo?.message}>
        <Input {...register("titulo")} placeholder="Título de la recomendación" />
      </Field>

      <Field label="Descripción" required error={errors.descripcion?.message}>
        <Textarea
          {...register("descripcion")}
          placeholder="Describe la recomendación"
        />
      </Field>

      <Field label="Ámbito" hint="Etiquetas separadas por coma">
        <Controller
          name="ambito"
          control={control}
          render={({ field }) => (
            <Input
              value={(field.value ?? []).join(", ")}
              onChange={(e) => field.onChange(csvToArray(e.target.value))}
              placeholder="ej. educación, vivienda, salud"
            />
          )}
        />
      </Field>

      <Field label="Destinatarios">
        <Input
          {...register("destinatarios")}
          placeholder="¿A quién va dirigida?"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Alcance">
          <Controller
            name="alcance"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                value={field.value ?? ""}
                options={alcanceOptions}
                placeholder="—"
              />
            )}
          />
        </Field>
        <Field label="Estado">
          <Controller
            name="estado"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                value={field.value ?? ""}
                options={estadoOptions}
                placeholder="—"
              />
            )}
          />
        </Field>
      </div>

      <Field label="Hallazgos vinculados">
        <Controller
          name="hallazgos_ids"
          control={control}
          render={({ field }) => (
            <MultiSelect
              options={hallazgosOptions}
              value={field.value ?? []}
              onChange={field.onChange}
              placeholder="Asociar hallazgos"
            />
          )}
        />
      </Field>

      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {recomendacion && onDelete && (
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
              : recomendacion
                ? "Guardar cambios"
                : "Crear recomendación"}
          </Button>
        </div>
      </div>
    </form>
  );
}
