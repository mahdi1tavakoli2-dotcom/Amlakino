import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value: initialValue = '',
  onChange,
  placeholder = 'جستجو در فایل‌ها، کد ملک، متقاضی...',
  className = '',
  debounceMs = 250,
}) => {
  const [innerValue, setInnerValue] = useState(initialValue);

  useEffect(() => {
    setInnerValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(innerValue);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [innerValue, debounceMs, onChange]);

  const handleClear = () => {
    setInnerValue('');
    onChange('');
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div className="absolute right-3.5 text-slate-400 pointer-events-none">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={innerValue}
        onChange={(e) => setInnerValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pr-10 pl-9 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 border border-transparent focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all outline-none min-h-[42px]"
      />
      {innerValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute left-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
