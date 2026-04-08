"use client";

import { Drawer } from "@/components/ui/Drawer";
import { UsuarioForm } from "./UsuarioForm";
import type { Usuario } from "@/lib/queries/usuarios";
import type { UsuarioFormValues } from "@/lib/schemas/usuario";

interface Props {
  open: boolean;
  onClose: () => void;
  usuario?: Usuario | null;
  onSubmit: (values: UsuarioFormValues) => Promise<void>;
  onToggleDisabled?: () => Promise<void>;
  submitting?: boolean;
}

export function UsuarioDrawer({
  open,
  onClose,
  usuario,
  onSubmit,
  onToggleDisabled,
  submitting,
}: Props) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={usuario ? "Editar usuario" : "Nuevo usuario"}
      description={
        usuario
          ? "Modifica los datos del usuario o cambia su estado."
          : "Crea un nuevo usuario con acceso al panel."
      }
      width="lg"
    >
      <UsuarioForm
        usuario={usuario}
        onSubmit={onSubmit}
        onToggleDisabled={onToggleDisabled}
        onCancel={onClose}
        submitting={submitting}
      />
    </Drawer>
  );
}
