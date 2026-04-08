"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MultiCheckbox } from "@/components/ui/MultiCheckbox";
import { Button } from "@/components/ui/Button";
import { proyectoSchema, type ProyectoFormValues } from "@/lib/schemas/proyecto";
import {
  ESTADO_PROYECTO,
  ESTADO_PROYECTO_LABELS,
  GRUPOS_POBLACION,
  GRUPOS_POBLACION_LABELS,
  toOptions,
} from "@/lib/enums";
import type { ProyectoConLider, Agente, GrupoPoblacion } from "@/lib/supabase/types";

interface Props {
  proyecto?: ProyectoConLider | null;
  agentes: Pick<Agente, "id" | "nombre" | "email">[];
  onSubmit: (values: ProyectoFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const estadoOptions = toOptions(ESTADO_PROYECTO, ESTADO_PROYECTO_LABELS);
const gruposPoblacionOptions = toOptions(
  GRUPOS_POBLACION,
  GRUPOS_POBLACION_LABELS,
);

export function ProyectoForm({
  proyecto,
  agentes,
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
  } = useForm<ProyectoFormValues>({
    resolver: zodResolver(proyectoSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      agente_lider_id: "",
      estado: null,
      financiador: "",
      grupos_poblacion: [],
      ccaa: "",
      enlace_1: "",
    },
  });

  useEffect(() => {
    if (proyecto) {
      reset({
        nombre: proyecto.nombre,
        descripcion: proyecto.descripcion ?? "",
        agente_lider_id: proyecto.agente_lider_id,
        estado: proyecto.estado,
        financiador: proyecto.financiador ?? "",
        grupos_poblacion: proyecto.grupos_poblacion ?? [],
        ccaa: proyecto.ccaa ?? "",
        enlace_1: proyecto.enlace_1 ?? "",
      });
    } else {
      reset({
        nombre: "",
        descripcion: "",
        agente_lider_id: "",
        estado: null,
        financiador: "",
        grupos_poblacion: [],
        ccaa: "",
        enlace_1: "",
      });
    }
  }, [proyecto, reset]);

  const agentesOptions = agentes.map((a) => ({
    value: a.id,
    label: a.nombre,
  }));

  async function handleDelete() {
    if (onDelete) await onDelete();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Nombre" required error={errors.nombre?.message}>
        <Input {...register("nombre")} placeholder="Nombre del proyecto" />
      </Field>

      <Field label="Descripción">
        <Textarea
          {...register("descripcion")}
          placeholder="Breve descripción del proyecto"
        />
      </Field>

      <Field
        label="Agente líder"
        required
        error={errors.agente_lider_id?.message}
      >
        <Controller
          name="agente_lider_id"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              value={field.value ?? ""}
              options={agentesOptions}
              placeholder="Selecciona un agente"
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

      <Field label="Financiador">
        <Input {...register("financiador")} placeholder="Entidad financiadora" />
      </Field>

      <Field label="CCAA">
        <Input {...register("ccaa")} placeholder="Comunidad autónoma" />
      </Field>

      <Field label="Enlace">
        <Input {...register("enlace_1")} placeholder="https://…" />
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

      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {proyecto && onDelete && (
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
              : proyecto
                ? "Guardar cambios"
                : "Crear proyecto"}
          </Button>
        </div>
      </div>
    </form>
  );
}
