import { describe, expect, it } from "vitest";
import { constructTable, tableFeatures } from "@tanstack/table-core";
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings";
import { tablaFeatures, type Columna } from "./features";

// Comprueba con el núcleo de TanStack Table (sin React) que las features
// registradas cubren lo que usa `DataTable`: filtro por columna, filtro global,
// ordenación y paginación, con la resolución `auto` de v8.

type Fila = { nombre: string; tipo: string; personas: number };

const columnas: Columna<Fila>[] = [
  { accessorKey: "nombre", header: "Nombre", meta: { width: "40%" } },
  { accessorKey: "tipo", header: "Tipo" },
  { accessorKey: "personas", header: "Personas" },
];

const datos: Fila[] = Array.from({ length: 45 }, (_, i) => ({
  nombre: `Agente ${String(i + 1).padStart(2, "0")}`,
  tipo: i % 3 === 0 ? "academia" : "sociedad_civil",
  personas: 100 - i,
}));

// Fuera de React hace falta la reactividad propia del núcleo (en la app la pone `useTable`).
const features = tableFeatures({
  ...tablaFeatures,
  coreReactivityFeature: storeReactivityBindings(),
});

function crearTabla() {
  return constructTable({
    features,
    columns: columnas,
    data: datos,
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
  });
}

describe("tablaFeatures", () => {
  it("pagina de 20 en 20", () => {
    const tabla = crearTabla();
    expect(tabla.getRowModel().rows).toHaveLength(20);
    expect(tabla.getPageCount()).toBe(3);
    expect(tabla.getCanPreviousPage()).toBe(false);
    tabla.nextPage();
    tabla.nextPage();
    expect(tabla.getRowModel().rows).toHaveLength(5);
    expect(tabla.getCanNextPage()).toBe(false);
  });

  it("filtra por columna sin distinguir mayúsculas", () => {
    const tabla = crearTabla();
    tabla.getColumn("nombre")?.setFilterValue("agente 1");
    expect(tabla.getFilteredRowModel().rows.map((r) => r.original.nombre)).toEqual(
      ["10", "11", "12", "13", "14", "15", "16", "17", "18", "19"].map((n) => `Agente ${n}`),
    );
  });

  it("filtra globalmente sobre las columnas de texto", () => {
    const tabla = crearTabla();
    tabla.setGlobalFilter("ACADEMIA");
    expect(tabla.getFilteredRowModel().rows).toHaveLength(15);
  });

  it("ordena con el conmutador de la cabecera", () => {
    const tabla = crearTabla();
    const columna = tabla.getColumn("personas");
    expect(columna?.getCanSort()).toBe(true);
    columna?.toggleSorting(false);
    expect(tabla.getRowModel().rows[0].original.personas).toBe(56);
    columna?.toggleSorting(true);
    expect(tabla.getRowModel().rows[0].original.personas).toBe(100);
  });

  it("expone la meta tipada de columna", () => {
    const tabla = crearTabla();
    expect(tabla.getColumn("nombre")?.columnDef.meta?.width).toBe("40%");
  });
});
