import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataTable } from "./DataTable";
import type { Columna } from "./features";

type Fila = { nombre: string; tipo: string };

const columnas: Columna<Fila>[] = [
  { accessorKey: "nombre", header: "Nombre", meta: { width: "40%", cellClassName: "font-medium" } },
  { accessorKey: "tipo", header: "Tipo", enableSorting: false },
];

function render(datos: Fila[]) {
  return renderToStaticMarkup(
    createElement(DataTable<Fila>, { columns: columnas, data: datos, emptyMessage: "Nada aquí" }),
  );
}

describe("DataTable", () => {
  it("pinta cabeceras, celdas, meta y pie de paginación", () => {
    const datos = Array.from({ length: 25 }, (_, i) => ({ nombre: `Agente ${i + 1}`, tipo: "academia" }));
    const html = render(datos);
    expect(html).toContain("Nombre");
    expect(html).toContain('style="width:40%"');
    expect(html).toContain("font-medium");
    expect(html.match(/<tr/g)).toHaveLength(1 + 20);
    expect(html).toContain("Página 1 de 2 · 25 registros");
  });

  it("muestra el mensaje vacío sin datos", () => {
    const html = render([]);
    expect(html).toContain("Nada aquí");
    expect(html).toContain("Página 1 de 1 · 0 registros");
  });
});
