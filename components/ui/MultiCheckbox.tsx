"use client";

// =============================================================================
// MultiCheckbox
// Grupo de checkboxes controlado que devuelve un array de valores seleccionados.
// Útil para campos que provienen de un enum LISTAS del Excel donde se pueden
// marcar varios (grupos_poblacion, rol_ecosistema, opciones_escalado…).
// =============================================================================

interface Option<V extends string> {
  value: V;
  label: string;
}

interface Props<V extends string> {
  options: Option<V>[];
  value: V[];
  onChange: (next: V[]) => void;
  columns?: 1 | 2 | 3;
}

export function MultiCheckbox<V extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: Props<V>) {
  const selected = new Set(value);

  function toggle(v: V, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(v);
    else next.delete(v);
    onChange(Array.from(next));
  }

  const gridClass =
    columns === 1
      ? "grid grid-cols-1 gap-1.5"
      : columns === 3
        ? "grid grid-cols-3 gap-1.5"
        : "grid grid-cols-2 gap-1.5";

  return (
    <div className={gridClass}>
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm hover:bg-slate-50"
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={selected.has(opt.value)}
            onChange={(e) => toggle(opt.value, e.target.checked)}
          />
          <span className="text-slate-700">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
