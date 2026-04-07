"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Field, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { agenteSchema, type AgenteFormValues } from "@/lib/schemas/agente";
import type { Agente } from "@/lib/supabase/types";

interface Props {
  agente?: Agente | null;
  onSubmit: (values: AgenteFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const tipoOptions = [
  { value: "sociedad_civil", label: "Sociedad civil" },
  { value: "sector_publico", label: "Sector público" },
  { value: "academia", label: "Academia" },
  { value: "sector_privado", label: "Sector privado" },
];

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
      tipo_agente: null,
      email: "",
      web: "",
    },
  });

  useEffect(() => {
    if (agente) {
      reset({
        nombre: agente.nombre,
        tipo_agente: agente.tipo_agente,
        email: agente.email ?? "",
        web: agente.web ?? "",
      });
    } else {
      reset({ nombre: "", tipo_agente: null, email: "", web: "" });
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
