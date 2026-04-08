import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { RoleKey } from "./roles";

// =============================================================================
// getCurrentUserWithRoles
//
// Helper unificado para Server Components, Route Handlers y layouts.
// Devuelve el usuario autenticado, su perfil (user_profiles) y la lista de
// roles que tiene asignados (user_roles).
// =============================================================================

export interface UserProfile {
  id: string;
  email: string | null;
  nombre: string | null;
  apellidos: string | null;
  disabled: boolean;
}

export interface CurrentUser {
  user: User;
  profile: UserProfile | null;
  roles: RoleKey[];
}

export async function getCurrentUserWithRoles(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: rolesRows }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, email, nombre, apellidos, disabled")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role_key").eq("user_id", user.id),
  ]);

  const roles = ((rolesRows ?? []) as { role_key: RoleKey }[]).map(
    (r) => r.role_key,
  );

  return {
    user,
    profile: (profile as UserProfile | null) ?? null,
    roles,
  };
}
