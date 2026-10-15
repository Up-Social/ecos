import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  globalFilteringFeature,
  metaHelper,
  rowPaginationFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  type ColumnDef,
} from "@tanstack/react-table";

// -----------------------------------------------------------------------------
// Features de TanStack Table v9 que usan las tablas del panel. En v9 cada
// capacidad se registra de forma explícita (en v8 venían todas incluidas).
// Se registran los catálogos completos de filtros y ordenación para que la
// resolución `auto` por tipo de dato se comporte como en v8.
// -----------------------------------------------------------------------------

/** Meta de columna que entiende `DataTable`. */
export interface ColumnaMeta {
  width?: string;
  cellClassName?: string;
}

export const tablaFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns,
  sortFns,
  columnMeta: metaHelper<ColumnaMeta>(),
});

export type TablaFeatures = typeof tablaFeatures;

/** Definición de columna para `DataTable`. */
export type Columna<TData extends object, TValue = unknown> = ColumnDef<
  TablaFeatures,
  TData,
  TValue
>;
