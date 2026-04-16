import { memo, useRef } from 'react';
import EditableCell from './EditableCell';
import type { EditableField, TableRowData } from '../hooks/useTable';

type TableRowProps = {
  row: TableRowData;
  index: number;
  isSelected: boolean;
  isActive: boolean;
  onToggleSelect: (id: string, index: number, shiftKey: boolean) => void;
  onActivate: (id: string) => void;
  onCellChange: (id: string, field: EditableField, value: string) => void;
  onCellNavigate: (id: string, field: EditableField, direction: -1 | 1) => void;
};

const editableOrder: EditableField[] = ['vendor', 'date', 'invoice_no', 'hostel_no', 'amount', 'tax', 'total'];

const statusMeta = (status: string) => {
  switch (status) {
    case 'pending':
      return { icon: '⚠', label: 'pending', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'edited':
      return { icon: '🟡', label: 'edited', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    case 'approved':
      return { icon: '✅', label: 'approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'rejected':
      return { icon: '❌', label: 'rejected', className: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return { icon: '⚠', label: status || 'pending', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

const TableRow = ({
  row,
  index,
  isSelected,
  isActive,
  onToggleSelect,
  onActivate,
  onCellChange,
  onCellNavigate,
}: TableRowProps) => {
  const lastShiftClickRef = useRef(false);
  const meta = statusMeta(row.status);

  return (
    <tr
      onClick={() => onActivate(row.id)}
      className={`border-b border-slate-100 text-xs transition-colors ${
        isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
      }`}
    >
      <td className="w-10 px-2 py-1.5" onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onClick={(event) => {
            lastShiftClickRef.current = event.shiftKey;
          }}
          onChange={() => onToggleSelect(row.id, index, lastShiftClickRef.current)}
          className="h-4 w-4 accent-primary"
        />
      </td>

      {editableOrder.map((field) => (
        <td key={field} className="px-1 py-1">
          <EditableCell
            cellKey={`${row.id}:${field}`}
            value={row[field]}
            onChange={(next) => onCellChange(row.id, field, next)}
            onNavigate={(direction) => onCellNavigate(row.id, field, direction)}
          />
        </td>
      ))}

      <td className="w-28 px-2 py-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
          <span aria-hidden>{meta.icon}</span>
          <span className="capitalize">{meta.label}</span>
        </span>
      </td>
    </tr>
  );
};

export default memo(TableRow);
