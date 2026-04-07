interface Props {
  /** Etiqueta uppercase a la izquierda de la línea (ej: "01 · Estado"). */
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Header narrativo + slot de contenido. Mantiene la jerarquía visual
 * coherente entre las distintas secciones del dashboard.
 */
export function DashboardSection({
  eyebrow,
  title,
  description,
  children,
}: Props) {
  return (
    <section className="space-y-3">
      <header>
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-600">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-0.5 text-base font-semibold text-slate-900">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}
