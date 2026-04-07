"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { InnovacionForm } from "./InnovacionForm";
import { RelationsSection } from "@/components/common/RelationsSection";
import {
  getMisionesDerivadasDeInnovacion,
  type DerivedItem,
} from "@/lib/queries/derived";
import type {
  InnovacionConRelaciones,
  Proyecto,
  Reto,
} from "@/lib/supabase/types";
import type { InnovacionFormValues } from "@/lib/schemas/innovacion";

interface Props {
  open: boolean;
  onClose: () => void;
  innovacion?: InnovacionConRelaciones | null;
  proyectos: Pick<Proyecto, "id" | "nombre">[];
  retos: Pick<Reto, "id" | "nombre">[];
  onSubmit: (values: InnovacionFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitting?: boolean;
}

export function InnovacionDrawer({
  open,
  onClose,
  innovacion,
  proyectos,
  retos,
  onSubmit,
  onDelete,
  submitting,
}: Props) {
  const [misiones, setMisiones] = useState<DerivedItem[]>([]);
  const [loadingDerived, setLoadingDerived] = useState(false);

  // Carga misiones derivadas al abrir el drawer en modo edición
  useEffect(() => {
    if (!open || !innovacion) {
      setMisiones([]);
      return;
    }
    let cancelled = false;
    setLoadingDerived(true);
    getMisionesDerivadasDeInnovacion(innovacion.id).then((items) => {
      if (cancelled) return;
      setMisiones(items);
      setLoadingDerived(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, innovacion]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={innovacion ? "Editar innovación" : "Nueva innovación"}
      description={
        innovacion
          ? "Modifica los datos y los retos vinculados."
          : "Crea una nueva innovación a partir de un proyecto."
      }
      width="lg"
    >
      <div className="space-y-6">
        <InnovacionForm
          innovacion={innovacion}
          proyectos={proyectos}
          retos={retos}
          onSubmit={onSubmit}
          onDelete={onDelete}
          onCancel={onClose}
          submitting={submitting}
        />

        {innovacion && (
          <RelationsSection
            loading={loadingDerived}
            emptyMessage="Esta innovación aún no tiene retos vinculados a misiones."
            groups={[
              {
                label: "Misiones",
                items: misiones,
                derived: true,
                tone: "purple",
              },
            ]}
          />
        )}
      </div>
    </Drawer>
  );
}
