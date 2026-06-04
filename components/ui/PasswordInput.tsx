"use client";

import {
  InputHTMLAttributes,
  forwardRef,
  useState,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputBaseClasses } from "./Input";

// =============================================================================
// PasswordInput — campo de contraseña con botón "ojo" para mostrar/ocultar.
// Reutiliza los estilos base de Input. Acepta un icono izquierdo opcional
// (p. ej. el candado de los formularios de login).
// =============================================================================

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Icono opcional alineado a la izquierda (p. ej. <Lock />). */
  leftIcon?: ReactNode;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, leftIcon, ...props }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn(inputBaseClasses, leftIcon && "pl-8", "pr-9", className)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
