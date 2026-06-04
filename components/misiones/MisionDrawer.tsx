"use client";

import { Drawer } from "@/components/ui/Drawer";
import { MisionForm } from "./MisionForm";
import { EntityRelationsTabs } from "@/components/relationships/EntityRelationsTabs";
import type { Mision } from "@/lib/supabase/types";
import type { MisionFormValues } from "@/lib/schemas/mision";

interface Props {
  open: boolean;
  onClose: () => void;
  mision?: Mision | null;
  onSubmit: (values: MisionFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitting?: boolean;
}

export function MisionDrawer({
  open,
  onClose,
  mision,
  onSubmit,
  onDelete,
  submitting,
}: Props) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={mision ? "Editar misión" : "Nueva misión"}
      description={
        mision
          ? "Modifica los datos de la misión."
          : "Define un nuevo objetivo estratégico."
      }
      width="lg"
    >
      <EntityRelationsTabs entityType="misiones" entityId={mision?.id}>
        <MisionForm
          mision={mision}
          onSubmit={onSubmit}
          onDelete={onDelete}
          onCancel={onClose}
          submitting={submitting}
        />
      </EntityRelationsTabs>
    </Drawer>
  );
}
