"use client";

import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { MissionProvider } from "@/lib/contexts/MissionContext";

/**
 * Compone los providers globales del cliente para que el server layout
 * solo tenga que renderizar este wrapper.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <MissionProvider>{children}</MissionProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
