"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DataTable } from "@/components/data-table/DataTable";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { usuariosColumns } from "./columns";
import { UsuarioDrawer } from "./UsuarioDrawer";
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  setUsuarioDisabled,
  type Usuario,
} from "@/lib/queries/usuarios";
import type { UsuarioFormValues } from "@/lib/schemas/usuario";

export function UsuariosClient() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);

  const toast = useToast();
  const confirm = useConfirm();

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getUsuarios();
    if (error) {
      toast.error("Error al cargar usuarios", error.message);
    }
    setUsuarios(data ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------
  async function handleSubmit(values: UsuarioFormValues) {
    setSubmitting(true);
    try {
      const { error } = editing
        ? await updateUsuario(editing.id, values)
        : await createUsuario(values);
      if (error) throw error;
      toast.success(editing ? "Usuario actualizado" : "Usuario creado");
      await fetchUsuarios();
      closeDrawer();
    } catch (e: any) {
      toast.error("Error al guardar", e?.message ?? "Inténtalo de nuevo");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleDisabled() {
    if (!editing) return;
    const willDisable = !editing.disabled;
    const ok = await confirm({
      title: willDisable ? "Deshabilitar usuario" : "Habilitar usuario",
      description: willDisable
        ? `¿Seguro que quieres deshabilitar a "${formatName(editing)}"? No podrá iniciar sesión hasta que lo habilites de nuevo.`
        : `¿Habilitar de nuevo a "${formatName(editing)}"?`,
      confirmText: willDisable ? "Deshabilitar" : "Habilitar",
      variant: willDisable ? "danger" : "default",
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const { error } = await setUsuarioDisabled(editing.id, willDisable);
      if (error) throw error;
      toast.success(
        willDisable ? "Usuario deshabilitado" : "Usuario habilitado",
      );
      await fetchUsuarios();
      closeDrawer();
    } catch (e: any) {
      toast.error("Error", e?.message ?? "Inténtalo de nuevo");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------
  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(u: Usuario) {
    setEditing(u);
    setDrawerOpen(true);
  }
  function closeDrawer() {
    setDrawerOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona los usuarios con acceso al panel y sus roles.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {loading ? (
        <TableSkeleton columns={4} />
      ) : usuarios.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay usuarios todavía"
          description="Crea el primer usuario para dar acceso al panel."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo usuario
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={usuariosColumns}
          data={usuarios}
          searchKey="email"
          searchPlaceholder="Buscar por email…"
          onRowClick={openEdit}
          emptyMessage="Sin resultados."
        />
      )}

      <UsuarioDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        usuario={editing}
        onSubmit={handleSubmit}
        onToggleDisabled={editing ? handleToggleDisabled : undefined}
        submitting={submitting}
      />
    </div>
  );
}

function formatName(u: Usuario) {
  const full = `${u.nombre ?? ""} ${u.apellidos ?? ""}`.trim();
  return full || u.email || u.id;
}
