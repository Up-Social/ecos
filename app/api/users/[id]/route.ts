import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserWithRoles } from "@/lib/auth/getCurrentUser";
import { isSuperadmin, ROLE_KEYS, type RoleKey } from "@/lib/auth/roles";

export const runtime = "nodejs";

// =============================================================================
// /api/users/[id]
//
// PATCH  → actualiza nombre, apellidos, roles[] y opcionalmente disabled
//          Si disabled cambia, se aplica banned_until en auth.
// =============================================================================

async function requireSuperadmin() {
  const current = await getCurrentUserWithRoles();
  if (!current) return { error: "No autenticado", status: 401 as const };
  if (!isSuperadmin(current.roles)) {
    return { error: "Permisos insuficientes", status: 403 as const };
  }
  return { current };
}

function sanitizeRoles(input: unknown): RoleKey[] | null {
  if (!Array.isArray(input)) return null;
  const valid = new Set<string>(ROLE_KEYS);
  const out: RoleKey[] = [];
  for (const r of input) {
    if (typeof r === "string" && valid.has(r)) out.push(r as RoleKey);
  }
  return Array.from(new Set(out));
}

const LONG_BAN = "876000h";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperadmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  let body: {
    nombre?: string | null;
    apellidos?: string | null;
    roles?: unknown;
    disabled?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. update profile fields
  const patch: Record<string, unknown> = {};
  if (body.nombre !== undefined) patch.nombre = body.nombre;
  if (body.apellidos !== undefined) patch.apellidos = body.apellidos;
  if (body.disabled !== undefined) patch.disabled = body.disabled;

  if (Object.keys(patch).length > 0) {
    const { error: updateError } = await admin
      .from("user_profiles")
      .update(patch)
      .eq("id", id);
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }
  }

  // 2. reemplazar set de roles si vienen en el body
  if (body.roles !== undefined) {
    const roles = sanitizeRoles(body.roles);
    if (!roles || roles.length === 0) {
      return NextResponse.json(
        { error: "Debes asignar al menos un rol" },
        { status: 400 },
      );
    }
    const { error: deleteError } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", id);
    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 },
      );
    }
    const { error: insertError } = await admin
      .from("user_roles")
      .insert(roles.map((role_key) => ({ user_id: id, role_key })));
    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }
  }

  // 3. ban/unban en auth si cambia disabled
  if (body.disabled !== undefined) {
    const { error: banError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: body.disabled ? LONG_BAN : "none",
    });
    if (banError) {
      return NextResponse.json({ error: banError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
