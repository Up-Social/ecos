import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserWithRoles } from "@/lib/auth/getCurrentUser";
import { isSuperadmin, ROLE_KEYS, type RoleKey } from "@/lib/auth/roles";

export const runtime = "nodejs";

// =============================================================================
// /api/users
//
// GET  → lista de usuarios (user_profiles + roles agregados)
// POST → crea un usuario (auth.admin.createUser + user_profile + user_roles)
//
// Solo accesible para superadmin (además del check de panel del middleware).
// =============================================================================

interface UserRow {
  id: string;
  email: string | null;
  nombre: string | null;
  apellidos: string | null;
  roles: RoleKey[];
  disabled: boolean;
  created_at: string;
}

async function requireSuperadmin() {
  const current = await getCurrentUserWithRoles();
  if (!current) return { error: "No autenticado", status: 401 as const };
  if (!isSuperadmin(current.roles)) {
    return { error: "Permisos insuficientes", status: 403 as const };
  }
  return { current };
}

function sanitizeRoles(input: unknown): RoleKey[] {
  if (!Array.isArray(input)) return [];
  const valid = new Set<string>(ROLE_KEYS);
  const out: RoleKey[] = [];
  for (const r of input) {
    if (typeof r === "string" && valid.has(r)) out.push(r as RoleKey);
  }
  return Array.from(new Set(out));
}

// -----------------------------------------------------------------------------
// GET — listado de usuarios
// -----------------------------------------------------------------------------
export async function GET() {
  const gate = await requireSuperadmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const admin = createAdminClient();

  // Desambiguación: user_roles.user_id tiene FK a auth.users y a user_profiles.
  // Indicamos explícitamente la constraint que apunta a user_profiles.
  const { data: profiles, error: profilesError } = await admin
    .from("user_profiles")
    .select(
      "id, email, nombre, apellidos, disabled, created_at, user_roles!user_roles_user_id_profile_fkey(role_key)",
    )
    .order("created_at", { ascending: false });

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const users: UserRow[] = (profiles ?? []).map((p: any) => ({
    id: p.id,
    email: p.email,
    nombre: p.nombre,
    apellidos: p.apellidos,
    disabled: p.disabled ?? false,
    created_at: p.created_at,
    roles: ((p.user_roles ?? []) as { role_key: RoleKey }[]).map(
      (r) => r.role_key,
    ),
  }));

  return NextResponse.json({ users });
}

// -----------------------------------------------------------------------------
// POST — crear usuario
// -----------------------------------------------------------------------------
export async function POST(req: Request) {
  const gate = await requireSuperadmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: {
    email?: string;
    password?: string;
    nombre?: string;
    apellidos?: string;
    roles?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: "Email y contraseña son obligatorios" },
      { status: 400 },
    );
  }
  const roles = sanitizeRoles(body.roles);
  if (roles.length === 0) {
    return NextResponse.json(
      { error: "Debes asignar al menos un rol" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // 1. crear user en auth
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });
  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "No se pudo crear el usuario" },
      { status: 400 },
    );
  }

  const newId = created.user.id;

  // 2. user_profile
  const { error: profileError } = await admin
    .from("user_profiles")
    .upsert(
      {
        id: newId,
        email: body.email,
        nombre: body.nombre ?? null,
        apellidos: body.apellidos ?? null,
        disabled: false,
      },
      { onConflict: "id" },
    );

  if (profileError) {
    await admin.auth.admin.deleteUser(newId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // 3. user_roles
  const { error: rolesError } = await admin
    .from("user_roles")
    .insert(roles.map((role_key) => ({ user_id: newId, role_key })));

  if (rolesError) {
    await admin.from("user_profiles").delete().eq("id", newId);
    await admin.auth.admin.deleteUser(newId);
    return NextResponse.json({ error: rolesError.message }, { status: 500 });
  }

  return NextResponse.json({ id: newId });
}
