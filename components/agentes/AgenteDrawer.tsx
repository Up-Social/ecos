"use client";

import { Drawer } from "@/components/ui/Drawer";
import { AgenteForm } from "./AgenteForm";
import type { Agente } from "@/lib/supabase/types";
import type { AgenteFormValues } from "@/lib/schemas/agente";

interface Props {
  open: boolean;
  onClose: () => void;
  agente?: Agente | null;
  onSubmit: (values: AgenteFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitting?: boolean;
}

export function AgenteDrawer({
  open,
  onClose,
  agente,
  onSubmit,
  onDelete,
  submitting,
}: Props) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={agente ? "Editar agente" : "Nuevo agente"}
      description={
        agente
          ? "Modifica los datos del agente."
          : "Crea un nuevo agente del ecosistema."
      }
      width="lg"
    >
      <AgenteForm
        agente={agente}
        onSubmit={onSubmit}
        onDelete={onDelete}
        onCancel={onClose}
        submitting={submitting}
      />
    </Drawer>
  );
}
