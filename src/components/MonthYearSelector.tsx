import React from 'react';
import { MONTH_FULL_NAMES } from '../utils/finance';

interface MonthYearSelectorProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  includeAllOption?: boolean;
  isAllSelected?: boolean;
  onSelectAll?: () => void;
}

export function MonthYearSelector({
  month,
  year,
  onChange,
  includeAllOption = false,
  isAllSelected = false,
  onSelectAll,
}: MonthYearSelectorProps) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="select-month" className="sr-only">
        Month
      </label>
      <select
        id="select-month"
        value={isAllSelected ? 'all' : String(month)}
        onChange={(e) => {
          if (e.target.value === 'all' && onSelectAll) {
            onSelectAll();
          } else {
            onChange(Number(e.target.value), year);
          }
        }}
        className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
      >
        {includeAllOption && <option value="all">All Months</option>}
        {MONTH_FULL_NAMES.map((name, idx) => (
          <option key={name} value={idx + 1}>
            {name}
          </option>
        ))}
      </select>

      {!isAllSelected && (
        <>
          <label htmlFor="select-year" className="sr-only">
            Year
          </label>
          <select
            id="select-year"
            value={year}
            onChange={(e) => onChange(month, Number(e.target.value))}
            className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
