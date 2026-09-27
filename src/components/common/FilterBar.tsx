import React from 'react';
import { Filter } from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export interface FilterBarProps {
  options: FilterOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onOpenAdvanced?: () => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  options,
  selectedId,
  onSelect,
  onOpenAdvanced,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 overflow-x-auto py-1 no-scrollbar select-none ${className}`}>
      {onOpenAdvanced && (
        <button
          type="button"
          onClick={onOpenAdvanced}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
        >
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>فیلترها</span>
        </button>
      )}

      <div className="flex items-center gap-1.5">
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer min-h-[36px]
                ${
                  isSelected
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <span>{option.label}</span>
              {option.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
