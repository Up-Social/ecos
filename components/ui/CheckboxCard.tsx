"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

/**
 * Checkbox con etiqueta y descripción, presentado como tarjeta clicable.
 * Compatible con `react-hook-form` vía `{...register("campo")}` (usa `checked`).
 */
export const CheckboxCard = forwardRef<HTMLInputElement, Props>(
  ({ label, description, className, ...props }, ref) => (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border border-slate-300 bg-white p-3 hover:bg-slate-50",
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-slate-500">
            {description}
          </span>
        )}
      </span>
    </label>
  ),
);
CheckboxCard.displayName = "CheckboxCard";
