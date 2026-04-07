"use client";

import { Drawer } from "@/components/ui/Drawer";
import { RecomendacionForm } from "./RecomendacionForm";
import type { RecomendacionConRelaciones, Hallazgo } from "@/lib/supabase/types";
import type { RecomendacionFormValues } from "@/lib/schemas/recomendacion";

interface Props {
  open: boolean;
  onClose: () => void;
  recomendacion?: RecomendacionConRelaciones | null;
  hallazgos: Pick<Hallazgo, "id" | "titulo">[];
  onSubmit: (values: RecomendacionFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitting?: boolean;
}

export function RecomendacionDrawer({
  open,
  onClose,
  recomendacion,
  hallazgos,
  onSubmit,
  onDelete,
  submitting,
}: Props) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={recomendacion ? "Editar recomendación" : "Nueva recomendación"}
      description={
        recomendacion
          ? "Modifica la recomendación y los hallazgos vinculados."
          : "Crea una recomendación de política o acción."
      }
      width="xl"
    >
      <RecomendacionForm
        recomendacion={recomendacion}
        hallazgos={hallazgos}
        onSubmit={onSubmit}
        onDelete={onDelete}
        onCancel={onClose}
        submitting={submitting}
      />
    </Drawer>
  );
}
