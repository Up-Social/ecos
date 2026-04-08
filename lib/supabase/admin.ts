import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// -----------------------------------------------------------------------------
// Cliente admin (service_role). ÚSALO SOLO EN SERVIDOR.
// Permite operaciones de auth.admin: crear usuarios, cambiar contraseñas,
// banear/desbanear, etc. Nunca importes este módulo desde componentes
// cliente — la key saltaría RLS y se expondría en el bundle.
// -----------------------------------------------------------------------------

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno",
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
