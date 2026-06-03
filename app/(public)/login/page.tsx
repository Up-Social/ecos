"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

// =============================================================================
// Login PÚBLICO `/login` — usuarios del portal (rol `usuario`).
// Autentica con email/contraseña y, tras el éxito, va a `/perfil` (o al destino
// solicitado). El acceso del equipo de administración vive en /admin/login.
// Los usuarios públicos los crea un administrador (gestión desde admin); no hay
// auto-registro.
// =============================================================================

function PublicLoginForm() {
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
    const redirect = searchParams.get("redirect") ?? "/perfil";
    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Acceso</h1>
        <p className="mt-1 text-sm text-slate-500">
          Entra en tu cuenta del portal ECOS
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
          <div className="relative">
            <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-8"
              placeholder="••••••••"
            />
          </div>
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
          href="/admin/login"
          className="block text-slate-400 hover:text-slate-600"
        >
          Acceso administración
        </Link>
      </div>
    </div>
  );
}

export default function PublicLoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <Suspense
        fallback={<div className="text-sm text-slate-400">Cargando…</div>}
      >
        <PublicLoginForm />
      </Suspense>
    </div>
  );
}
