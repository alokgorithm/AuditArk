import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ReceiptData } from './PushBatchButton';
import type { ReceiptFile } from '../hooks/useFileUpload';
import { useTable, type EditableField, type SortKey } from '../hooks/useTable';
import TableRow from './TableRow';

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends object> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
}

type SpreadsheetDataTableProps = {
  files: ReceiptFile[];
  receiptDataMap: Record<string, ReceiptData>;
  selectedIds: string[];
  activeId?: string;
  onActiveIdChange?: (id: string) => void;
  onCellChange: (id: string, field: EditableField, value: string) => void;
  onSelectedIdsChange?: (ids: string[]) => void;
  toggleSelect?: (id: string) => void;
  selectAll?: () => void;
  isAllSelected?: boolean;
};

const SORTABLE_COLUMNS: { key: SortKey; label: string; width?: string }[] = [
  { key: 'vendor', label: 'Vendor' },
  { key: 'date', label: 'Date' },
  { key: 'invoice_no', label: 'Invoice' },
  { key: 'hostel_no', label: 'Hostel', width: 'w-24' },
  { key: 'amount', label: 'Amount', width: 'w-24' },
  { key: 'tax', label: 'Tax', width: 'w-24' },
  { key: 'total', label: 'Total', width: 'w-24' },
  { key: 'status', label: 'Status', width: 'w-28' },
];

function LegacyDataTable<T extends object>({ data, columns, onRowClick, isLoading }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const valA = a[sortKey as keyof T];
    const valB = b[sortKey as keyof T];
    if (valA === valB) return 0;
    if (valA == null) return 1;
    if (valB == null) return -1;
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    return sortDir === 'asc' ? 1 : -1;
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-[#1F4E79] text-white">
          <tr className="group">
            {columns.map((col) => (
              <th 
                key={col.key} 
                className={`px-6 py-4 font-semibold ${col.sortable ? 'cursor-pointer hover:bg-[#153a5c] select-none transition-colors' : ''}`}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div className="flex items-center space-x-1">
                  <span>{col.header}</span>
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center text-slate-500">
                <div className="flex justify-center mb-2"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                Loading data...
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center text-slate-500">
                No items found.
              </td>
            </tr>
          ) : (
            sortedData.map((row, i) => (
              <tr 
                key={i} 
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50'} ${i % 2 === 0 ? 'bg-white' : 'bg-[#F2F7FB]/50'}`}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-6 py-3.5 text-slate-700">
                    {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const SpreadsheetDataTable = memo(({
  files,
  receiptDataMap,
  selectedIds,
  activeId,
  onActiveIdChange,
  onCellChange,
  onSelectedIdsChange,
  toggleSelect,
  selectAll,
  isAllSelected,
}: SpreadsheetDataTableProps) => {
  const {
    filteredRows,
    sortKey,
    sortOrder,
    setSort,
    filters,
    setFilters,
    updateCell,
  } = useTable({ files, receiptDataMap, onCellChange });

  const [localActiveId, setLocalActiveId] = useState<string>('');
  const lastSelectedIndexRef = useRef<number | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const currentActiveId = activeId ?? localActiveId;

  const setActiveId = useCallback((id: string) => {
    if (onActiveIdChange) {
      onActiveIdChange(id);
      return;
    }
    setLocalActiveId(id);
  }, [onActiveIdChange]);

  const updateSelection = useCallback((next: Set<string>) => {
    if (onSelectedIdsChange) {
      onSelectedIdsChange(Array.from(next));
    }
  }, [onSelectedIdsChange]);

  const handleToggleSelect = useCallback((id: string, index: number, shiftKey: boolean) => {
    if (onSelectedIdsChange) {
      const next = new Set(selectedSet);

      if (shiftKey && lastSelectedIndexRef.current !== null) {
        const start = Math.min(lastSelectedIndexRef.current, index);
        const end = Math.max(lastSelectedIndexRef.current, index);
        const shouldSelect = !next.has(id);

        for (let i = start; i <= end; i += 1) {
          const row = filteredRows[i];
          if (!row) continue;
          if (shouldSelect) next.add(row.id);
          else next.delete(row.id);
        }
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      lastSelectedIndexRef.current = index;
      updateSelection(next);
      return;
    }

    toggleSelect?.(id);
  }, [filteredRows, onSelectedIdsChange, selectedSet, toggleSelect, updateSelection]);

  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(row => selectedSet.has(row.id));
  const allChecked = isAllSelected ?? allVisibleSelected;

  const handleSelectAll = useCallback(() => {
    if (onSelectedIdsChange) {
      const next = new Set(selectedSet);

      if (allVisibleSelected) {
        filteredRows.forEach(row => next.delete(row.id));
      } else {
        filteredRows.forEach(row => next.add(row.id));
      }

      updateSelection(next);
      return;
    }

    selectAll?.();
  }, [allVisibleSelected, filteredRows, onSelectedIdsChange, selectAll, selectedSet, updateSelection]);

  const handleCellNavigate = useCallback((id: string, field: EditableField, direction: -1 | 1) => {
    const rowIndex = filteredRows.findIndex(row => row.id === id);
    if (rowIndex < 0) return;

    const fieldOrder: EditableField[] = ['vendor', 'date', 'invoice_no', 'hostel_no', 'amount', 'tax', 'total'];
    const fieldIndex = fieldOrder.indexOf(field);
    if (fieldIndex < 0) return;

    const nextFlatIndex = rowIndex * fieldOrder.length + fieldIndex + direction;
    if (nextFlatIndex < 0) return;

    const nextRowIndex = Math.floor(nextFlatIndex / fieldOrder.length);
    const nextFieldIndex = nextFlatIndex % fieldOrder.length;
    const nextRow = filteredRows[nextRowIndex];
    if (!nextRow) return;

    setActiveId(nextRow.id);

    requestAnimationFrame(() => {
      const key = `${nextRow.id}:${fieldOrder[nextFieldIndex]}`;
      const element = document.querySelector<HTMLElement>(`[data-editable-cell="${key}"]`);
      element?.click();
    });
  }, [filteredRows, setActiveId]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-1 gap-2 border-b border-slate-200 bg-slate-50 p-2 md:grid-cols-[1fr_180px_140px]">
        <input
          type="text"
          value={filters.vendor}
          onChange={(event) => setFilters(prev => ({ ...prev, vendor: event.target.value }))}
          placeholder="Filter vendor"
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-blue-200 focus:ring-2"
        />
        <input
          type="date"
          value={filters.date}
          onChange={(event) => setFilters(prev => ({ ...prev, date: event.target.value }))}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-blue-200 focus:ring-2"
        />
        <select
          value={filters.status}
          onChange={(event) => setFilters(prev => ({ ...prev, status: event.target.value as typeof prev.status }))}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-blue-200 focus:ring-2"
        >
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="edited">Edited</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs text-slate-700">
            <tr>
              <th className="w-10 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={handleSelectAll}
                  className="h-4 w-4 accent-primary"
                />
              </th>
              {SORTABLE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  onClick={() => setSort(column.key)}
                  className={`select-none px-2 py-2 font-semibold ${column.width ?? ''} cursor-pointer hover:bg-slate-200`}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>{column.label}</span>
                    {sortKey === column.key ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">No rows match filters</td>
              </tr>
            ) : (
              filteredRows.map((row, index) => (
                <TableRow
                  key={row.id}
                  row={row}
                  index={index}
                  isSelected={selectedSet.has(row.id)}
                  isActive={currentActiveId === row.id}
                  onToggleSelect={handleToggleSelect}
                  onActivate={setActiveId}
                  onCellChange={updateCell}
                  onCellNavigate={handleCellNavigate}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const isSpreadsheetProps = (props: unknown): props is SpreadsheetDataTableProps => {
  return typeof props === 'object' && props !== null && 'files' in props && 'receiptDataMap' in props;
};

export function DataTable<T extends object>(props: DataTableProps<T> | SpreadsheetDataTableProps) {
  if (isSpreadsheetProps(props)) {
    return <SpreadsheetDataTable {...props} />;
  }

  return <LegacyDataTable {...props} />;
}
