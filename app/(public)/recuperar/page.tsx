"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { requestPasswordReset } from "@/lib/queries/profile";

// =============================================================================
// Recuperación de contraseña `/recuperar` (público).
// Envía un email con un enlace que vuelve a /auth/callback (intercambia el
// código por sesión) y redirige a /perfil, donde se fija la nueva contraseña.
// =============================================================================

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await requestPasswordReset(email, origin);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Recuperar contraseña
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Te enviaremos un enlace para restablecerla.
          </p>
        </div>

        {sent ? (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <CheckCircle2 className="mb-1 h-5 w-5" />
            Si existe una cuenta con ese email, recibirás un enlace para
            restablecer la contraseña. Revisa tu bandeja de entrada.
          </div>
        ) : (
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

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              <Send className="h-4 w-4" />
              {loading ? "Enviando…" : "Enviar enlace"}
            </Button>
          </form>
        )}

        <div className="text-center text-sm">
          <Link href="/login" className="text-brand-600 hover:text-brand-700">
            Volver al acceso
          </Link>
        </div>
      </div>
    </div>
  );
}
