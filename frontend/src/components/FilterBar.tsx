import React from 'react';
import { useVendors } from '../hooks/useVendors';
import { useBatches } from '../hooks/useBatches';

export type FilterState = {
  vendor?: string;
  month?: number;
  year?: number;
  hostel_no?: number;
  batch_id?: number;
  date_from?: string;
  date_to?: string;
  report_type?: string;
};

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
  children?: React.ReactNode; 
}

export function FilterBar({ filters, onChange, onClear, children }: FilterBarProps) {
  const { data: vendors } = useVendors();
  const { data: batches } = useBatches();
  
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const handleUpdate = (field: keyof FilterState, value: any) => {
    const newFilters = { ...filters };
    if (!value) delete newFilters[field];
    else newFilters[field] = value;
    onChange(newFilters);
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Vendor</label>
          <select 
            value={filters.vendor || ''}
            onChange={e => handleUpdate('vendor', e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
          >
            <option value="">All Vendors</option>
            {vendors?.map(v => <option key={v.id} value={v.canonical_name}>{v.canonical_name}</option>)}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Month</label>
            <select 
              value={filters.month || ''}
              onChange={e => handleUpdate('month', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="">Any</option>
              {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Year</label>
            <input 
              type="number"
              placeholder="YYYY"
              value={filters.year || ''}
              onChange={e => handleUpdate('year', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Hostel No</label>
            <input 
              type="number"
              placeholder="Any"
              value={filters.hostel_no || ''}
              onChange={e => handleUpdate('hostel_no', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Batch</label>
            <select 
              value={filters.batch_id || ''}
              onChange={e => handleUpdate('batch_id', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none truncate"
            >
              <option value="">All</option>
              {batches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date From</label>
            <input 
              type="date"
              value={filters.date_from || ''}
              onChange={e => handleUpdate('date_from', e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date To</label>
            <input 
              type="date"
              value={filters.date_to || ''}
              onChange={e => handleUpdate('date_to', e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-100 gap-4">
        <div>
          <button 
            onClick={onClear}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
        <div className="flex space-x-3">
          {children}
        </div>
      </div>
    </div>
  );
}
