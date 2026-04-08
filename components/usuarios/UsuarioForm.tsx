"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, CheckCircle2 } from "lucide-react";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  usuarioCreateSchema,
  usuarioUpdateSchema,
  type UsuarioFormValues,
} from "@/lib/schemas/usuario";
import {
  ROLE_KEYS,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  type RoleKey,
} from "@/lib/auth/roles";
import type { Usuario } from "@/lib/queries/usuarios";

interface Props {
  usuario?: Usuario | null;
  onSubmit: (values: UsuarioFormValues) => Promise<void>;
  onToggleDisabled?: () => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export function UsuarioForm({
  usuario,
  onSubmit,
  onToggleDisabled,
  onCancel,
  submitting,
}: Props) {
  const isEdit = !!usuario;
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(isEdit ? usuarioUpdateSchema : usuarioCreateSchema),
    defaultValues: {
      email: "",
      password: "",
      nombre: "",
      apellidos: "",
      roles: ["gestor"],
    },
  });

  useEffect(() => {
    if (usuario) {
      reset({
        email: usuario.email ?? "",
        password: "",
        nombre: usuario.nombre ?? "",
        apellidos: usuario.apellidos ?? "",
        roles: usuario.roles.length > 0 ? usuario.roles : ["gestor"],
      });
    } else {
      reset({
        email: "",
        password: "",
        nombre: "",
        apellidos: "",
        roles: ["gestor"],
      });
    }
  }, [usuario, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Nombre" required error={errors.nombre?.message}>
        <Input {...register("nombre")} placeholder="Nombre" />
      </Field>

      <Field label="Apellidos" required error={errors.apellidos?.message}>
        <Input {...register("apellidos")} placeholder="Apellidos" />
      </Field>

      <Field label="Email" required error={errors.email?.message}>
        <Input
          type="email"
          {...register("email")}
          placeholder="usuario@ejemplo.org"
          disabled={isEdit}
        />
      </Field>

      {!isEdit && (
        <Field
          label="Contraseña"
          required
          error={errors.password?.message}
        >
          <Input
            type="password"
            {...register("password")}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
        </Field>
      )}

      <Field label="Roles" required error={errors.roles?.message as string | undefined}>
        <Controller
          name="roles"
          control={control}
          render={({ field }) => {
            const selected = new Set<RoleKey>((field.value ?? []) as RoleKey[]);
            function toggle(key: RoleKey, checked: boolean) {
              const next = new Set(selected);
              if (checked) next.add(key);
              else next.delete(key);
              field.onChange(Array.from(next));
            }
            return (
              <div className="space-y-2">
                {ROLE_KEYS.map((key) => (
                  <label
                    key={key}
                    className="flex items-start gap-2 rounded-md border border-slate-200 p-2.5 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={selected.has(key)}
                      onChange={(e) => toggle(key, e.target.checked)}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">
                        {ROLE_LABELS[key]}
                      </div>
                      <div className="text-xs text-slate-500">
                        {ROLE_DESCRIPTIONS[key]}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            );
          }}
        />
      </Field>

      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {usuario && onToggleDisabled && (
            <Button
              type="button"
              variant="ghost"
              onClick={onToggleDisabled}
              className={
                usuario.disabled
                  ? "text-green-700 hover:bg-green-50"
                  : "text-amber-700 hover:bg-amber-50"
              }
              disabled={submitting}
            >
              {usuario.disabled ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Habilitar
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" />
                  Deshabilitar
                </>
              )}
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
              : isEdit
                ? "Guardar cambios"
                : "Crear usuario"}
          </Button>
        </div>
      </div>
    </form>
  );
}
