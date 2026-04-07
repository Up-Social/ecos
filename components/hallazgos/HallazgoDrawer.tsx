"use client";

import { Drawer } from "@/components/ui/Drawer";
import { HallazgoForm } from "./HallazgoForm";
import type { HallazgoConRelaciones, Innovacion } from "@/lib/supabase/types";
import type { HallazgoFormValues } from "@/lib/schemas/hallazgo";

interface Props {
  open: boolean;
  onClose: () => void;
  hallazgo?: HallazgoConRelaciones | null;
  innovaciones: Pick<Innovacion, "id" | "nombre">[];
  onSubmit: (values: HallazgoFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitting?: boolean;
}

export function HallazgoDrawer({
  open,
  onClose,
  hallazgo,
  innovaciones,
  onSubmit,
  onDelete,
  submitting,
}: Props) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={hallazgo ? "Editar hallazgo" : "Nuevo hallazgo"}
      description={
        hallazgo
          ? "Modifica los datos del hallazgo."
          : "Documenta una evidencia o aprendizaje."
      }
      width="xl"
    >
      <HallazgoForm
        hallazgo={hallazgo}
        innovaciones={innovaciones}
        onSubmit={onSubmit}
        onDelete={onDelete}
        onCancel={onClose}
        submitting={submitting}
      />
    </Drawer>
  );
}
