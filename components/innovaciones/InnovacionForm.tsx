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
  innovacionSchema,
  type InnovacionFormValues,
} from "@/lib/schemas/innovacion";
import { MultiCheckbox } from "@/components/ui/MultiCheckbox";
import {
  ESTADO_EXPERIMENTACION,
  ESTADO_EXPERIMENTACION_LABELS,
  NIVEL_IMPACTO,
  NIVEL_IMPACTO_LABELS,
  RANGO_PARTICIPANTES,
  RANGO_PARTICIPANTES_LABELS,
  GRUPOS_POBLACION,
  GRUPOS_POBLACION_LABELS,
  OPCIONES_ESCALADO,
  OPCIONES_ESCALADO_LABELS,
  toOptions,
} from "@/lib/enums";
import type {
  InnovacionConRelaciones,
  Proyecto,
  Reto,
  GrupoPoblacion,
  OpcionEscalado,
} from "@/lib/supabase/types";

interface Props {
  innovacion?: InnovacionConRelaciones | null;
  proyectos: Pick<Proyecto, "id" | "nombre">[];
  retos: Pick<Reto, "id" | "nombre">[];
  onSubmit: (values: InnovacionFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const estadoOptions = toOptions(
  ESTADO_EXPERIMENTACION,
  ESTADO_EXPERIMENTACION_LABELS,
);
const impactoOptions = toOptions(NIVEL_IMPACTO, NIVEL_IMPACTO_LABELS);
const rangoOptions = toOptions(
  RANGO_PARTICIPANTES,
  RANGO_PARTICIPANTES_LABELS,
);
const gruposPoblacionOptions = toOptions(
  GRUPOS_POBLACION,
  GRUPOS_POBLACION_LABELS,
);
const opcionesEscaladoOptions = toOptions(
  OPCIONES_ESCALADO,
  OPCIONES_ESCALADO_LABELS,
);

export function InnovacionForm({
  innovacion,
  proyectos,
  retos,
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
  } = useForm<InnovacionFormValues>({
    resolver: zodResolver(innovacionSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      proyecto_id: "",
      estado: null,
      nivel_impacto: null,
      n_participantes: null,
      grupos_poblacion: [],
      opciones_escalado: [],
      enlace_referencia: "",
      retos_ids: [],
    },
  });

  useEffect(() => {
    if (innovacion) {
      reset({
        nombre: innovacion.nombre,
        descripcion: innovacion.descripcion ?? "",
        proyecto_id: innovacion.proyecto_id,
        estado: innovacion.estado,
        nivel_impacto: innovacion.nivel_impacto,
        n_participantes: innovacion.n_participantes,
        grupos_poblacion: innovacion.grupos_poblacion ?? [],
        opciones_escalado: innovacion.opciones_escalado ?? [],
        enlace_referencia: innovacion.enlace_referencia ?? "",
        retos_ids: innovacion.retos.map((r) => r.id),
      });
    } else {
      reset({
        nombre: "",
        descripcion: "",
        proyecto_id: "",
        estado: null,
        nivel_impacto: null,
        n_participantes: null,
        grupos_poblacion: [],
        opciones_escalado: [],
        enlace_referencia: "",
        retos_ids: [],
      });
    }
  }, [innovacion, reset]);

  const proyectosOptions = proyectos.map((p) => ({
    value: p.id,
    label: p.nombre,
  }));

  const retosOptions = retos.map((r) => ({ value: r.id, label: r.nombre }));

  async function handleDelete() {
    if (onDelete) await onDelete();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Nombre" required error={errors.nombre?.message}>
        <Input {...register("nombre")} placeholder="Nombre de la innovación" />
      </Field>

      <Field label="Descripción">
        <Textarea
          {...register("descripcion")}
          placeholder="¿Qué problema resuelve y cómo?"
        />
      </Field>

      <Field label="Proyecto" required error={errors.proyecto_id?.message}>
        <Controller
          name="proyecto_id"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              value={field.value ?? ""}
              options={proyectosOptions}
              placeholder="Selecciona un proyecto"
            />
          )}
        />
      </Field>

      <Field label="Retos vinculados">
        <Controller
          name="retos_ids"
          control={control}
          render={({ field }) => (
            <MultiSelect
              options={retosOptions}
              value={field.value ?? []}
              onChange={field.onChange}
              placeholder="Asociar retos"
            />
          )}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
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
        <Field label="Nivel de impacto">
          <Controller
            name="nivel_impacto"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                value={field.value ?? ""}
                options={impactoOptions}
                placeholder="—"
              />
            )}
          />
        </Field>
      </div>

      <Field label="Rango de participantes">
        <Controller
          name="n_participantes"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              value={field.value ?? ""}
              options={rangoOptions}
              placeholder="—"
            />
          )}
        />
      </Field>

      <Field label="Grupos de población">
        <Controller
          name="grupos_poblacion"
          control={control}
          render={({ field }) => (
            <MultiCheckbox
              options={gruposPoblacionOptions}
              value={(field.value ?? []) as GrupoPoblacion[]}
              onChange={field.onChange}
            />
          )}
        />
      </Field>

      <Field label="Opciones de escalado">
        <Controller
          name="opciones_escalado"
          control={control}
          render={({ field }) => (
            <MultiCheckbox
              options={opcionesEscaladoOptions}
              value={(field.value ?? []) as OpcionEscalado[]}
              onChange={field.onChange}
              columns={1}
            />
          )}
        />
      </Field>

      <Field label="Enlace de referencia">
        <Input
          type="url"
          {...register("enlace_referencia")}
          placeholder="https://…"
        />
      </Field>

      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {innovacion && onDelete && (
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
              : innovacion
                ? "Guardar cambios"
                : "Crear innovación"}
          </Button>
        </div>
      </div>
    </form>
  );
}
