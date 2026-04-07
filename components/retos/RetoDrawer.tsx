"use client";

import { Drawer } from "@/components/ui/Drawer";
import { RetoForm } from "./RetoForm";
import type { RetoConRelaciones, Mision } from "@/lib/supabase/types";
import type { RetoFormValues } from "@/lib/schemas/reto";

interface Props {
  open: boolean;
  onClose: () => void;
  reto?: RetoConRelaciones | null;
  misiones: Pick<Mision, "id" | "nombre">[];
  onSubmit: (values: RetoFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitting?: boolean;
}

export function RetoDrawer({
  open,
  onClose,
  reto,
  misiones,
  onSubmit,
  onDelete,
  submitting,
}: Props) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={reto ? "Editar reto" : "Nuevo reto"}
      description={
        reto
          ? "Modifica el reto y sus misiones vinculadas."
          : "Crea un nuevo reto operativo."
      }
      width="lg"
    >
      <RetoForm
        reto={reto}
        misiones={misiones}
        onSubmit={onSubmit}
        onDelete={onDelete}
        onCancel={onClose}
        submitting={submitting}
      />
    </Drawer>
  );
}
