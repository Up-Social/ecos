"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { ProyectoForm } from "./ProyectoForm";
import { RelationsSection } from "@/components/common/RelationsSection";
import {
  getProyectoRelacionesDerivadas,
  type DerivedItem,
} from "@/lib/queries/derived";
import type { ProyectoConLider, Agente } from "@/lib/supabase/types";
import type { ProyectoFormValues } from "@/lib/schemas/proyecto";

interface Props {
  open: boolean;
  onClose: () => void;
  proyecto?: ProyectoConLider | null;
  agentes: Pick<Agente, "id" | "nombre" | "email">[];
  onSubmit: (values: ProyectoFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitting?: boolean;
}

export function ProyectoDrawer({
  open,
  onClose,
  proyecto,
  agentes,
  onSubmit,
  onDelete,
  submitting,
}: Props) {
  const [misiones, setMisiones] = useState<DerivedItem[]>([]);
  const [retos, setRetos] = useState<DerivedItem[]>([]);
  const [loadingDerived, setLoadingDerived] = useState(false);

  // Carga relaciones derivadas cuando se abre el drawer en modo edición
  useEffect(() => {
    if (!open || !proyecto) {
      setMisiones([]);
      setRetos([]);
      return;
    }
    let cancelled = false;
    setLoadingDerived(true);
    getProyectoRelacionesDerivadas(proyecto.id).then((res) => {
      if (cancelled) return;
      setMisiones(res.misiones);
      setRetos(res.retos);
      setLoadingDerived(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, proyecto]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={proyecto ? "Editar proyecto" : "Nuevo proyecto"}
      description={
        proyecto
          ? "Modifica los datos del proyecto."
          : "Crea un nuevo proyecto vinculado a un agente líder."
      }
      width="lg"
    >
      <div className="space-y-6">
        <ProyectoForm
          proyecto={proyecto}
          agentes={agentes}
          onSubmit={onSubmit}
          onDelete={onDelete}
          onCancel={onClose}
          submitting={submitting}
        />

        {proyecto && (
          <RelationsSection
            loading={loadingDerived}
            emptyMessage="Este proyecto aún no tiene innovaciones con retos asociados."
            groups={[
              {
                label: "Retos",
                items: retos,
                derived: true,
                tone: "blue",
              },
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
