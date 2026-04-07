"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

// =============================================================================
// Tipos
// =============================================================================

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
}

interface ConfirmContextValue {
  /** Devuelve true si el usuario confirma, false si cancela. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// =============================================================================
// Context + Provider
// =============================================================================

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  }
  return ctx.confirm;
}

interface DialogState {
  open: boolean;
  options: ConfirmOptions;
  resolve?: (value: boolean) => void;
}

const DEFAULT_OPTIONS: ConfirmOptions = { title: "" };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({
    open: false,
    options: DEFAULT_OPTIONS,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  function close(value: boolean) {
    state.resolve?.(value);
    setState((s) => ({ ...s, open: false }));
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        state={state}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    </ConfirmContext.Provider>
  );
}

// =============================================================================
// Dialog UI
// =============================================================================

function ConfirmDialog({
  state,
  onConfirm,
  onCancel,
}: {
  state: DialogState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { open, options } = state;
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus en el botón de confirmar al abrir + escape para cancelar
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = options.variant === "danger";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[90] flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          {isDanger && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          )}
          <div className="flex-1">
            <h3
              id="confirm-title"
              className="text-base font-semibold text-slate-900"
            >
              {options.title}
            </h3>
            {options.description && (
              <p className="mt-1 text-sm text-slate-600">{options.description}</p>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {options.cancelText ?? "Cancelar"}
          </Button>
          <Button
            ref={confirmRef}
            variant={isDanger ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {options.confirmText ?? "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
