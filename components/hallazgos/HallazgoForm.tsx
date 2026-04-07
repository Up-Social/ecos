"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { hallazgoSchema, type HallazgoFormValues } from "@/lib/schemas/hallazgo";
import type {
  HallazgoConRelaciones,
  Innovacion,
} from "@/lib/supabase/types";

interface Props {
  hallazgo?: HallazgoConRelaciones | null;
  innovaciones: Pick<Innovacion, "id" | "nombre">[];
  onSubmit: (values: HallazgoFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const evidenciaOptions = [
  { value: "practica_documentada", label: "Práctica documentada" },
  { value: "datos_sistematicos", label: "Datos sistemáticos" },
  { value: "evaluacion_estructurada", label: "Evaluación estructurada" },
  { value: "evidencia_replicada", label: "Evidencia replicada" },
];

export function HallazgoForm({
  hallazgo,
  innovaciones,
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
  } = useForm<HallazgoFormValues>({
    resolver: zodResolver(hallazgoSchema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      innovacion_id: "",
      nivel_evidencia: null,
      evidencia_cuantitativa: "",
      fuente: "",
      enlace: "",
      validado: false,
    },
  });

  useEffect(() => {
    if (hallazgo) {
      reset({
        titulo: hallazgo.titulo,
        descripcion: hallazgo.descripcion,
        innovacion_id: hallazgo.innovacion_id,
        nivel_evidencia: hallazgo.nivel_evidencia,
        evidencia_cuantitativa: hallazgo.evidencia_cuantitativa ?? "",
        fuente: hallazgo.fuente ?? "",
        enlace: hallazgo.enlace ?? "",
        validado: hallazgo.validado,
      });
    } else {
      reset({
        titulo: "",
        descripcion: "",
        innovacion_id: "",
        nivel_evidencia: null,
        evidencia_cuantitativa: "",
        fuente: "",
        enlace: "",
        validado: false,
      });
    }
  }, [hallazgo, reset]);

  const innovacionesOptions = innovaciones.map((i) => ({
    value: i.id,
    label: i.nombre,
  }));

  async function handleDelete() {
    if (onDelete) await onDelete();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Título" required error={errors.titulo?.message}>
        <Input {...register("titulo")} placeholder="Título del hallazgo" />
      </Field>

      <Field label="Descripción" required error={errors.descripcion?.message}>
        <Textarea
          {...register("descripcion")}
          placeholder="Describe el hallazgo y su contexto"
        />
      </Field>

      <Field label="Innovación" required error={errors.innovacion_id?.message}>
        <Controller
          name="innovacion_id"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              value={field.value ?? ""}
              options={innovacionesOptions}
              placeholder="Selecciona una innovación"
            />
          )}
        />
      </Field>

      <Field label="Nivel de evidencia">
        <Controller
          name="nivel_evidencia"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              value={field.value ?? ""}
              options={evidenciaOptions}
              placeholder="—"
            />
          )}
        />
      </Field>

      <Field label="Evidencia cuantitativa">
        <Textarea
          {...register("evidencia_cuantitativa")}
          placeholder="Datos numéricos o métricas relevantes"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fuente">
          <Input {...register("fuente")} placeholder="Fuente del hallazgo" />
        </Field>
        <Field label="Enlace" error={errors.enlace?.message}>
          <Input
            type="url"
            {...register("enlace")}
            placeholder="https://…"
          />
        </Field>
      </div>

      <Field label="">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            {...register("validado")}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>Hallazgo validado</span>
        </label>
      </Field>

      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {hallazgo && onDelete && (
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
              : hallazgo
                ? "Guardar cambios"
                : "Crear hallazgo"}
          </Button>
        </div>
      </div>
    </form>
  );
}
