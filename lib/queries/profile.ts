import { createClient } from "@/lib/supabase/client";

// -----------------------------------------------------------------------------
// Perfil del usuario autenticado (cualquier rol), desde el browser.
// Opera bajo RLS self-access: cada usuario lee/edita únicamente su propio
// `user_profiles` (id = auth.uid()). No requiere endpoint privilegiado.
// -----------------------------------------------------------------------------

const supabase = createClient();

export interface MyProfile {
  id: string;
  email: string | null;
  nombre: string | null;
  apellidos: string | null;
}

/** Perfil del usuario autenticado, o null si no hay sesión. */
export async function getMyProfile(): Promise<{
  data: MyProfile | null;
  error: { message: string } | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "No autenticado" } };

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, email, nombre, apellidos")
    .eq("id", user.id)
    .maybeSingle();

  return { data: (data as MyProfile | null) ?? null, error };
}

/** Actualiza nombre y apellidos del usuario autenticado. */
export async function updateMyProfile(values: {
  nombre: string;
  apellidos: string;
}): Promise<{ error: { message: string } | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { message: "No autenticado" } };

  const { error } = await supabase
    .from("user_profiles")
    .update({
      nombre: values.nombre || null,
      apellidos: values.apellidos || null,
    })
    .eq("id", user.id);

  return { error };
}

/** Cambia la contraseña del usuario autenticado. */
export async function updateMyPassword(password: string) {
  return supabase.auth.updateUser({ password });
}

/**
 * Envía un email de recuperación de contraseña. El enlace vuelve a
 * `/auth/callback`, que intercambia el código por sesión y redirige a `/perfil`,
 * donde el usuario fija la nueva contraseña.
 */
export async function requestPasswordReset(email: string, origin: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/perfil`,
  });
}
