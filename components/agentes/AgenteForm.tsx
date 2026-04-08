"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MultiCheckbox } from "@/components/ui/MultiCheckbox";
import { Button } from "@/components/ui/Button";
import { agenteSchema, type AgenteFormValues } from "@/lib/schemas/agente";
import {
  TIPO_AGENTE,
  TIPO_AGENTE_LABELS,
  ROL_ECOSISTEMA,
  GRUPOS_POBLACION,
  GRUPOS_POBLACION_LABELS,
  toOptions,
} from "@/lib/enums";
import type {
  Agente,
  RolEcosistema,
  GrupoPoblacion,
} from "@/lib/supabase/types";

interface Props {
  agente?: Agente | null;
  onSubmit: (values: AgenteFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const tipoOptions = toOptions(TIPO_AGENTE, TIPO_AGENTE_LABELS);
// rol_ecosistema usa los valores del Excel como label (tienen acentos/ñ)
const rolEcosistemaOptions = ROL_ECOSISTEMA.map((r) => ({
  value: r,
  label: r.charAt(0).toUpperCase() + r.slice(1),
}));
const gruposPoblacionOptions = toOptions(
  GRUPOS_POBLACION,
  GRUPOS_POBLACION_LABELS,
);

export function AgenteForm({
  agente,
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
  } = useForm<AgenteFormValues>({
    resolver: zodResolver(agenteSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      tipo_agente: null,
      email: "",
      web: "",
      municipio_sede: "",
      rol_ecosistema: [],
      grupos_poblacion: [],
      personas_implicadas: null,
      presupuesto: null,
    },
  });

  useEffect(() => {
    if (agente) {
      reset({
        nombre: agente.nombre,
        descripcion: agente.descripcion ?? "",
        tipo_agente: agente.tipo_agente,
        email: agente.email ?? "",
        web: agente.web ?? "",
        municipio_sede: agente.municipio_sede ?? "",
        rol_ecosistema: agente.rol_ecosistema ?? [],
        grupos_poblacion: agente.grupos_poblacion ?? [],
        personas_implicadas: agente.personas_implicadas,
        presupuesto: agente.presupuesto,
      });
    } else {
      reset({
        nombre: "",
        descripcion: "",
        tipo_agente: null,
        email: "",
        web: "",
        municipio_sede: "",
        rol_ecosistema: [],
        grupos_poblacion: [],
        personas_implicadas: null,
        presupuesto: null,
      });
    }
  }, [agente, reset]);

  async function handleDelete() {
    // La confirmación la gestiona el ConfirmDialog provider vía useEntityActions
    if (onDelete) await onDelete();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Nombre" required error={errors.nombre?.message}>
        <Input {...register("nombre")} placeholder="Nombre del agente" />
      </Field>

      <Field label="Tipo de agente">
        <Controller
          name="tipo_agente"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              value={field.value ?? ""}
              options={tipoOptions}
              placeholder="Selecciona un tipo"
            />
          )}
        />
      </Field>

      <Field label="Email" error={errors.email?.message}>
        <Input
          type="email"
          {...register("email")}
          placeholder="contacto@ejemplo.org"
        />
      </Field>

      <Field label="Web" error={errors.web?.message}>
        <Input
          type="url"
          {...register("web")}
          placeholder="https://ejemplo.org"
        />
      </Field>

      <Field label="Descripción">
        <Textarea
          {...register("descripcion")}
          placeholder="Breve descripción del agente"
        />
      </Field>

      <Field label="Municipio sede">
        <Input
          {...register("municipio_sede")}
          placeholder="Municipio donde tiene la sede"
        />
      </Field>

      <Field label="Rol en el ecosistema">
        <Controller
          name="rol_ecosistema"
          control={control}
          render={({ field }) => (
            <MultiCheckbox
              options={rolEcosistemaOptions}
              value={(field.value ?? []) as RolEcosistema[]}
              onChange={field.onChange}
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Personas implicadas">
          <Input
            type="number"
            {...register("personas_implicadas", {
              setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
            })}
            placeholder="0"
          />
        </Field>
        <Field label="Presupuesto (€)">
          <Input
            type="number"
            step="0.01"
            {...register("presupuesto", {
              setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
            })}
            placeholder="0"
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {agente && onDelete && (
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
            {submitting ? "Guardando…" : agente ? "Guardar cambios" : "Crear agente"}
          </Button>
        </div>
      </div>
    </form>
  );
}
