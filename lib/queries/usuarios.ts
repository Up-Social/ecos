import type { RoleKey } from "@/lib/auth/roles";
import type { UsuarioFormValues } from "@/lib/schemas/usuario";

// -----------------------------------------------------------------------------
// Queries de usuarios.
// Todas las operaciones pasan por /api/users (protegido por superadmin).
// Mantenemos la convención { data, error } para encajar con el resto de hooks.
// -----------------------------------------------------------------------------

export interface Usuario {
  id: string;
  email: string | null;
  nombre: string | null;
  apellidos: string | null;
  roles: RoleKey[];
  disabled: boolean;
  created_at: string;
}

type Result<T> = { data: T | null; error: { message: string } | null };

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function getUsuarios(): Promise<Result<Usuario[]>> {
  const res = await fetch("/api/users", { cache: "no-store" });
  if (!res.ok) {
    return { data: null, error: { message: await parseError(res) } };
  }
  const body = (await res.json()) as { users: Usuario[] };
  return { data: body.users, error: null };
}

export async function createUsuario(
  values: UsuarioFormValues,
): Promise<Result<{ id: string }>> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: values.email,
      password: values.password,
      nombre: values.nombre,
      apellidos: values.apellidos,
      roles: values.roles,
    }),
  });
  if (!res.ok) {
    return { data: null, error: { message: await parseError(res) } };
  }
  return { data: await res.json(), error: null };
}

export async function updateUsuario(
  id: string,
  values: UsuarioFormValues,
): Promise<Result<{ ok: true }>> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: values.nombre,
      apellidos: values.apellidos,
      roles: values.roles,
    }),
  });
  if (!res.ok) {
    return { data: null, error: { message: await parseError(res) } };
  }
  return { data: { ok: true }, error: null };
}

export async function setUsuarioDisabled(
  id: string,
  disabled: boolean,
): Promise<Result<{ ok: true }>> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ disabled }),
  });
  if (!res.ok) {
    return { data: null, error: { message: await parseError(res) } };
  }
  return { data: { ok: true }, error: null };
}
