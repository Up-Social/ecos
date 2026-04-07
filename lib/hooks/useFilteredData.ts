import { useMemo } from "react";
import type { FilterDef, FilterValues } from "@/components/data-table/FilterBar";

/**
 * Aplica un conjunto de filtros sobre una lista. Los filtros se combinan
 * con AND: una fila pasa solo si cumple todos los filtros activos.
 */
export function useFilteredData<T>(
  data: T[],
  filters: FilterDef<T>[],
  values: FilterValues,
): T[] {
  return useMemo(() => {
    const activeFilters = filters.filter((f) => values[f.id]);
    if (activeFilters.length === 0) return data;
    return data.filter((row) =>
      activeFilters.every((f) => f.predicate(row, values[f.id] as string)),
    );
  }, [data, filters, values]);
}
