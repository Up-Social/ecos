"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Save, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import {
  getMyProfile,
  updateMyProfile,
  updateMyPassword,
} from "@/lib/queries/profile";

// =============================================================================
// Perfil del usuario autenticado `/perfil` (plano público, requiere sesión).
// Permite editar nombre/apellidos, cambiar la contraseña y cerrar sesión.
// La protección de sesión la aplica el middleware (plano público protegido).
// =============================================================================

export default function PerfilPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [loading, setLoading] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyProfile().then(({ data }) => {
      if (cancelled || !data) {
        setLoading(false);
        return;
      }
      setEmail(data.email ?? "");
      setNombre(data.nombre ?? "");
      setApellidos(data.apellidos ?? "");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    const { error } = await updateMyProfile({ nombre, apellidos });
    setSavingProfile(false);
    setProfileMsg(error ? `Error: ${error.message}` : "Datos guardados.");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(null);
    setPwdMsg(null);
    if (password.length < 8) {
      setPwdError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== password2) {
      setPwdError("Las contraseñas no coinciden.");
      return;
    }
    setSavingPwd(true);
    const { error } = await updateMyPassword(password);
    setSavingPwd(false);
    if (error) {
      setPwdError(error.message);
      return;
    }
    setPassword("");
    setPassword2("");
    setPwdMsg("Contraseña actualizada.");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-sm text-slate-400">
        Cargando perfil…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Mi perfil</h1>
        <Button variant="ghost" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>

      {/* Datos personales */}
      <form
        onSubmit={handleSaveProfile}
        className="space-y-4 rounded-lg border border-slate-200 p-5"
      >
        <h2 className="text-sm font-semibold text-slate-900">Datos personales</h2>

        <Field label="Email">
          <Input value={email} disabled className="bg-slate-50" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre">
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
            />
          </Field>
          <Field label="Apellidos">
            <Input
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              placeholder="Tus apellidos"
            />
          </Field>
        </div>

        {profileMsg && (
          <p className="text-sm text-slate-600">{profileMsg}</p>
        )}

        <div className="flex justify-end">
          <Button type="submit" loading={savingProfile}>
            <Save className="h-4 w-4" />
            Guardar
          </Button>
        </div>
      </form>

      {/* Cambio de contraseña */}
      <form
        onSubmit={handleChangePassword}
        className="space-y-4 rounded-lg border border-slate-200 p-5"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <KeyRound className="h-4 w-4 text-slate-400" />
          Cambiar contraseña
        </h2>

        <Field label="Nueva contraseña" required>
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
        </Field>
        <Field label="Repite la contraseña" required>
          <Input
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {pwdError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {pwdError}
          </div>
        )}
        {pwdMsg && <p className="text-sm text-green-700">{pwdMsg}</p>}

        <div className="flex justify-end">
          <Button type="submit" loading={savingPwd}>
            Actualizar contraseña
          </Button>
        </div>
      </form>
    </div>
  );
}
