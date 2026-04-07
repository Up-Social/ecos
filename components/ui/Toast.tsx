"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Tipos
// =============================================================================

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (toast: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

// =============================================================================
// Context + Provider
// =============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { ...t, id }]);
  }, []);

  const success = useCallback(
    (title: string, description?: string) =>
      toast({ type: "success", title, description }),
    [toast],
  );
  const error = useCallback(
    (title: string, description?: string) =>
      toast({ type: "error", title, description, duration: 6000 }),
    [toast],
  );
  const info = useCallback(
    (title: string, description?: string) =>
      toast({ type: "info", title, description }),
    [toast],
  );
  const warning = useCallback(
    (title: string, description?: string) =>
      toast({ type: "warning", title, description }),
    [toast],
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <ToastViewport toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}

// =============================================================================
// Viewport (portal-like, fixed positioning)
// =============================================================================

function ToastViewport({
  toasts,
  onClose,
}: {
  toasts: Toast[];
  onClose: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => onClose(t.id)} />
      ))}
    </div>
  );
}

// =============================================================================
// Item
// =============================================================================

const styles: Record<
  ToastType,
  { bg: string; border: string; icon: React.ComponentType<{ className?: string }>; iconColor: string }
> = {
  success: {
    bg: "bg-white",
    border: "border-green-200",
    icon: CheckCircle2,
    iconColor: "text-green-600",
  },
  error: {
    bg: "bg-white",
    border: "border-red-200",
    icon: XCircle,
    iconColor: "text-red-600",
  },
  info: {
    bg: "bg-white",
    border: "border-blue-200",
    icon: Info,
    iconColor: "text-blue-600",
  },
  warning: {
    bg: "bg-white",
    border: "border-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
  },
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const { type, title, description, duration = 4000 } = toast;
  const s = styles[type];
  const Icon = s.icon;

  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-lg",
        "animate-in slide-in-from-right",
        s.bg,
        s.border,
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-slate-600">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Cerrar notificación"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
