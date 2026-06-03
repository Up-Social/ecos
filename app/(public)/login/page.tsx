import Link from "next/link";
import type { Metadata } from "next";

// =============================================================================
// Login PÚBLICO `/login` — placeholder.
// Los usuarios públicos (registro/login/perfil) se implementan en la Fase 07.
// Aquí no hay autenticación: solo la estructura del plano público.
// El acceso del equipo de administración vive en /admin/login.
// =============================================================================

export const metadata: Metadata = {
  title: "Acceso — ECOS",
};

export default function PublicLoginPage() {
  return (
    <section className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Acceso público</h1>
      <p className="mt-3 text-sm text-slate-600">
        El acceso para usuarios del portal público estará disponible próximamente.
      </p>
      <p className="mt-6 text-sm text-slate-500">
        ¿Formas parte del equipo?{" "}
        <Link
          href="/admin/login"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Acceso administración
        </Link>
      </p>
    </section>
  );
}
