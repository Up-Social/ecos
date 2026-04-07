import { Construction } from "lucide-react";

interface Props {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-16 text-center">
        <Construction className="h-10 w-10 text-slate-400" />
        <p className="text-sm font-medium text-slate-600">Sección en construcción</p>
        <p className="max-w-sm text-xs text-slate-400">
          Replica el patrón de <code className="rounded bg-slate-100 px-1">proyectos</code>{" "}
          (columns + Form + Drawer + Client) para implementar esta entidad.
        </p>
      </div>
    </div>
  );
}
