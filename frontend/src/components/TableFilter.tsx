import { useState, useRef, useEffect, useCallback } from 'react';
import type { UseTableFilterReturn, FilterConfig, ActiveFilter } from '../hooks/useTableFilter';

// ─── SVG Icons ───────────────────────────────────────────────────────

function FunnelIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function CloseIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ─── Chip Component ──────────────────────────────────────────────────

function FilterChip({
  filter,
  config,
  onRemove,
}: {
  filter: ActiveFilter;
  config?: FilterConfig;
  onRemove: () => void;
}) {
  const getDisplayValue = (): string => {
    switch (filter.type) {
      case 'select': {
        const values = Array.isArray(filter.value) ? filter.value : [filter.value];
        const labels = values.map(v => {
          const opt = config?.options?.find(o => o.value === v);
          return opt?.label || v;
        });
        return labels.join(', ');
      }
      case 'boolean': {
        const boolLabels = config?.booleanLabels || { true: 'Sim', false: 'Não' };
        return filter.value === 'true' ? boolLabels.true : boolLabels.false;
      }
      case 'date-range': {
        if (!Array.isArray(filter.value)) return '';
        const [start, end] = filter.value;
        if (start && end) return `${formatDateBR(start)} a ${formatDateBR(end)}`;
        if (start) return `A partir de ${formatDateBR(start)}`;
        if (end) return `Até ${formatDateBR(end)}`;
        return '';
      }
      default:
        return String(filter.value);
    }
  };

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-fadeIn">
      <span className="text-blue-400 font-medium">{filter.label}:</span>
      <span>{getDisplayValue()}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 p-0.5 rounded-full hover:bg-blue-200 transition-colors"
        title={`Remover filtro ${filter.label}`}
      >
        <CloseIcon className="w-3 h-3" />
      </button>
    </span>
  );
}

// ─── Filter Controls inside Popover ──────────────────────────────────

function SelectFilterControl({
  config,
  currentValue,
  onChange,
}: {
  config: FilterConfig;
  currentValue: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (val: string) => {
    if (currentValue.includes(val)) {
      onChange(currentValue.filter(v => v !== val));
    } else {
      onChange([...currentValue, val]);
    }
  };

  return (
    <div className="space-y-1.5">
      {config.options?.map(opt => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={currentValue.includes(opt.value)}
            onChange={() => toggle(opt.value)}
            className="w-3.5 h-3.5 rounded border-gray-300 text-[#1a63b6] focus:ring-[#1a63b6] focus:ring-offset-0"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function BooleanFilterControl({
  config,
  currentValue,
  onChange,
}: {
  config: FilterConfig;
  currentValue: string;
  onChange: (value: string | null) => void;
}) {
  const labels = config.booleanLabels || { true: 'Sim', false: 'Não' };

  return (
    <div className="flex gap-2">
      {[
        { val: 'true', label: labels.true },
        { val: 'false', label: labels.false },
      ].map(({ val, label }) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(currentValue === val ? null : val)}
          className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded border transition-all ${
            currentValue === val
              ? 'bg-[#1a63b6] text-white border-[#1a63b6] shadow-sm'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function DateRangeFilterControl({
  currentValue,
  onChange,
}: {
  config: FilterConfig;
  currentValue: string[];
  onChange: (value: string[]) => void;
}) {
  const [start, end] = currentValue.length === 2 ? currentValue : ['', ''];

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={start}
        onChange={e => onChange([e.target.value, end])}
        className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6] focus:border-transparent"
      />
      <span className="text-gray-400 text-xs font-medium shrink-0">a</span>
      <input
        type="date"
        value={end}
        onChange={e => onChange([start, e.target.value])}
        className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a63b6] focus:border-transparent"
      />
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Draft state helpers ─────────────────────────────────────────────

type DraftValues = Record<string, string | string[]>;

function buildDraftFromFilters(activeFilters: ActiveFilter[]): DraftValues {
  const draft: DraftValues = {};
  for (const af of activeFilters) {
    draft[af.key] = af.value;
  }
  return draft;
}

// ─── Main Component ──────────────────────────────────────────────────

interface TableFilterProps<T> {
  filter: UseTableFilterReturn<T>;
}

export function TableFilter<T extends Record<string, any>>({ filter }: TableFilterProps<T>) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Draft state: holds uncommitted filter values while the popover is open
  const [draft, setDraft] = useState<DraftValues>({});

  // Sync draft from committed filters when popover opens
  const openPopover = useCallback(() => {
    setDraft(buildDraftFromFilters(filter.activeFilters));
    setPopoverOpen(true);
  }, [filter.activeFilters]);

  // Close popover on outside click (discards draft)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverOpen]);

  // Draft setters
  const setDraftValue = (key: string, value: string | string[] | null) => {
    setDraft(prev => {
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
  };

  const getDraftValue = (key: string): any => {
    if (key in draft) return draft[key];
    const cfg = filter.configs.find(c => c.key === key);
    return cfg?.type === 'select' ? [] : '';
  };

  // Apply: commit draft to the real filter state
  const handleApply = () => {
    // First clear all, then set each draft value
    filter.clearAll();
    for (const [key, value] of Object.entries(draft)) {
      filter.setFilter(key, value);
    }
    setPopoverOpen(false);
  };

  // Clear all in draft
  const handleClearDraft = () => {
    setDraft({});
  };

  const hasDraftValues = Object.keys(draft).length > 0;

  // Only show non-text configs in the popover
  const visibleConfigs = filter.configs.filter(c => c.type !== 'text');

  return (
    <>
      {/* Filter Button + Popover */}
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => popoverOpen ? setPopoverOpen(false) : openPopover()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-all ${
            filter.hasActiveFilters
              ? 'bg-blue-50 text-[#1a63b6] border-blue-200 shadow-sm'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <FunnelIcon className="w-3.5 h-3.5" />
          Filtrar
          {filter.hasActiveFilters && (
            <span className="ml-1 flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[#1a63b6] text-white text-[10px] font-bold leading-none px-1.5 py-0.5">
              {filter.activeFilters.length}
            </span>
          )}
        </button>

        {/* Popover */}
        {popoverOpen && (
          <div className="absolute top-10 right-0 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-30 overflow-hidden animate-slideDown">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filtros</span>
              {hasDraftValues && (
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Limpar tudo
                </button>
              )}
            </div>

            {/* Filter Controls */}
            <div className="p-3 space-y-4 max-h-80 overflow-y-auto">
              {visibleConfigs.map(cfg => (
                <div key={cfg.key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {cfg.label}
                  </label>

                  {cfg.type === 'select' && (
                    <SelectFilterControl
                      config={cfg}
                      currentValue={Array.isArray(getDraftValue(cfg.key)) ? getDraftValue(cfg.key) : []}
                      onChange={values => setDraftValue(cfg.key, values)}
                    />
                  )}

                  {cfg.type === 'boolean' && (
                    <BooleanFilterControl
                      config={cfg}
                      currentValue={typeof getDraftValue(cfg.key) === 'string' ? getDraftValue(cfg.key) : ''}
                      onChange={value => setDraftValue(cfg.key, value)}
                    />
                  )}

                  {cfg.type === 'date-range' && (
                    <DateRangeFilterControl
                      config={cfg}
                      currentValue={Array.isArray(getDraftValue(cfg.key)) ? getDraftValue(cfg.key) : ['', '']}
                      onChange={value => {
                        if (!value[0] && !value[1]) {
                          setDraftValue(cfg.key, null);
                        } else {
                          setDraftValue(cfg.key, value);
                        }
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Footer with Apply button */}
            <div className="px-3 py-2.5 bg-gray-50 border-t border-gray-200">
              <button
                type="button"
                onClick={handleApply}
                className="w-full px-4 py-2 text-sm font-semibold text-white bg-[#1a63b6] rounded hover:bg-blue-800 transition-colors shadow-sm"
              >
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Filter Chips — rendered below the toolbar */}
      {filter.hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-2 mb-1 animate-fadeIn">
          {filter.activeFilters.map(af => (
            <FilterChip
              key={af.key}
              filter={af}
              config={filter.configs.find(c => c.key === af.key)}
              onRemove={() => filter.removeFilter(af.key)}
            />
          ))}
          <button
            type="button"
            onClick={filter.clearAll}
            className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors ml-1"
          >
            Limpar tudo
          </button>
        </div>
      )}
    </>
  );
}
