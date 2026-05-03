import { useState, useMemo, useCallback } from 'react';

// --- Public types ---

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  /** Key used to access the field on each data item (supports nested via dot-notation in the future) */
  key: string;
  /** Human-readable label shown in the filter popover and chips */
  label: string;
  /** Type of filter control */
  type: 'select' | 'text' | 'date-range' | 'boolean';
  /** Required for type='select'. The list of possible values. */
  options?: FilterOption[];
  /** Labels for boolean filters (defaults to Sim / Não) */
  booleanLabels?: { true: string; false: string };
}

export interface ActiveFilter {
  key: string;
  label: string;
  type: FilterConfig['type'];
  /** For select: selected values. For text: search string. For boolean: 'true'|'false'. For date-range: [start, end]. */
  value: string | string[];
}

export interface UseTableFilterReturn<T> {
  /** The data array after all active filters have been applied */
  filteredData: T[];
  /** Currently active filters */
  activeFilters: ActiveFilter[];
  /** Set a filter value. Passing empty/null clears it. */
  setFilter: (key: string, value: string | string[] | null) => void;
  /** Remove a single filter by key */
  removeFilter: (key: string) => void;
  /** Clear all filters */
  clearAll: () => void;
  /** Whether any filter is active */
  hasActiveFilters: boolean;
  /** The filter configurations (pass-through for the UI component) */
  configs: FilterConfig[];
}

// --- Hook ---

export function useTableFilter<T extends Record<string, any>>(
  data: T[],
  configs: FilterConfig[]
): UseTableFilterReturn<T> {
  const [filterValues, setFilterValues] = useState<Record<string, string | string[]>>({});

  const setFilter = useCallback((key: string, value: string | string[] | null) => {
    setFilterValues(prev => {
      const next = { ...prev };
      if (
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }, []);

  const removeFilter = useCallback((key: string) => {
    setFilterValues(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFilterValues({});
  }, []);

  const activeFilters: ActiveFilter[] = useMemo(() => {
    return Object.entries(filterValues).map(([key, value]) => {
      const cfg = configs.find(c => c.key === key);
      return {
        key,
        label: cfg?.label || key,
        type: cfg?.type || 'text',
        value,
      };
    });
  }, [filterValues, configs]);

  const filteredData = useMemo(() => {
    if (Object.keys(filterValues).length === 0) return data;

    return data.filter(item => {
      return Object.entries(filterValues).every(([key, filterValue]) => {
        const cfg = configs.find(c => c.key === key);
        if (!cfg) return true;

        const itemValue = item[key];

        switch (cfg.type) {
          case 'select': {
            // filterValue is an array of selected values
            const selected = Array.isArray(filterValue) ? filterValue : [filterValue];
            if (selected.length === 0) return true;
            const strVal = String(itemValue ?? '');
            return selected.includes(strVal);
          }

          case 'text': {
            if (typeof filterValue !== 'string' || !filterValue) return true;
            const strVal = String(itemValue ?? '').toLowerCase();
            return strVal.includes(filterValue.toLowerCase());
          }

          case 'boolean': {
            if (typeof filterValue !== 'string') return true;
            const expected = filterValue === 'true';
            return Boolean(itemValue) === expected;
          }

          case 'date-range': {
            if (!Array.isArray(filterValue) || filterValue.length !== 2) return true;
            const [start, end] = filterValue;
            if (!start && !end) return true;
            if (!itemValue) return false;

            const itemDate = new Date(itemValue);
            if (isNaN(itemDate.getTime())) return false;

            if (start) {
              const startDate = new Date(start);
              startDate.setHours(0, 0, 0, 0);
              if (itemDate < startDate) return false;
            }
            if (end) {
              const endDate = new Date(end);
              endDate.setHours(23, 59, 59, 999);
              if (itemDate > endDate) return false;
            }
            return true;
          }

          default:
            return true;
        }
      });
    });
  }, [data, filterValues, configs]);

  return {
    filteredData,
    activeFilters,
    setFilter,
    removeFilter,
    clearAll,
    hasActiveFilters: activeFilters.length > 0,
    configs,
  };
}
