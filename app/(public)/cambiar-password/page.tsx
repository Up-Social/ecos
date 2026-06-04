"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import {
  updateMyPassword,
  clearMustChangePassword,
} from "@/lib/queries/profile";
import { PANEL_ROLES, type RoleKey } from "@/lib/auth/roles";

// =============================================================================
// `/cambiar-password` — cambio de contraseña OBLIGATORIO en el primer acceso.
// El middleware redirige aquí a cualquier usuario con `must_change_password`.
// Al fijar una contraseña nueva se limpia el flag y se redirige según el rol
// (panel → /dashboard, resto → /asistente).
// =============================================================================

export default function CambiarPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    const { error: pwdError } = await updateMyPassword(password);
    if (pwdError) {
      setError(pwdError.message);
      setSaving(false);
      return;
    }
    await clearMustChangePassword();

    // Destino según rol: el equipo va al panel; el resto, al asistente.
    let dest = "/asistente";
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: rolesRows } = await supabase
        .from("user_roles")
        .select("role_key")
        .eq("user_id", user.id);
      const roles = ((rolesRows ?? []) as { role_key: RoleKey }[]).map(
        (r) => r.role_key,
      );
      if (roles.some((r) => PANEL_ROLES.includes(r))) dest = "/dashboard";
    }

    router.push(dest);
    router.refresh();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Cambia tu contraseña
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Por seguridad, establece una contraseña nueva para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nueva contraseña" required>
            <PasswordInput
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </Field>
          <Field label="Repite la contraseña" required>
            <PasswordInput
              autoComplete="new-password"
              required
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" loading={saving} className="w-full">
            Guardar y continuar
          </Button>
        </form>

        <div className="text-center text-sm">
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-600"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
