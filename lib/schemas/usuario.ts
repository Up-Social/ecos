import { z } from "zod";
import { ROLE_KEYS } from "@/lib/auth/roles";

export const roleKeyEnum = z.enum(ROLE_KEYS as [string, ...string[]]);

const baseFields = {
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellidos: z.string().min(1, "Los apellidos son obligatorios"),
  roles: z
    .array(roleKeyEnum)
    .min(1, "Debes asignar al menos un rol"),
};

// Crear: email + password obligatorios
export const usuarioCreateSchema = z.object({
  email: z.string().email("Email no válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
  ...baseFields,
});

// Editar: email/password no se editan aquí
export const usuarioUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().optional().or(z.literal("")),
  ...baseFields,
});

// Schema unificado para el form (las validaciones varían según modo)
export const usuarioFormSchema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().optional().or(z.literal("")),
  ...baseFields,
});

export type UsuarioCreateValues = z.input<typeof usuarioCreateSchema>;
export type UsuarioUpdateValues = z.input<typeof usuarioUpdateSchema>;
export type UsuarioFormValues = z.input<typeof usuarioFormSchema>;
