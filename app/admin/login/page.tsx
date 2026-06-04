"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, LogIn, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { createClient } from "@/lib/supabase/client";

// =============================================================================
// Login de ADMINISTRACIÓN `/admin/login`.
// Reubica el login del panel (antes en `/login`). Autentica con email/password
// y, tras el éxito, va al destino solicitado o a /dashboard.
// Vive FUERA del route group guardado `(panel)`, por lo que es accesible sin
// sesión (el middleware lo trata como público).
// =============================================================================

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const redirect = searchParams.get("redirect") ?? "/dashboard";
    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">ECOS</h1>
        <p className="mt-1 text-sm text-slate-500">
          Acceso al panel de administración
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" required>
          <div className="relative">
            <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-8"
              placeholder="tu@email.com"
            />
          </div>
        </Field>

        <Field label="Contraseña" required>
          <PasswordInput
            leftIcon={<Lock className="h-4 w-4" />}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          <LogIn className="h-4 w-4" />
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <div className="space-y-2 text-center text-sm">
        <Link
          href="/recuperar"
          className="block text-brand-600 hover:text-brand-700"
        >
          ¿Olvidaste tu contraseña?
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-600"
        >
          <Home className="h-3.5 w-3.5" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Suspense
        fallback={<div className="text-sm text-slate-400">Cargando…</div>}
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
