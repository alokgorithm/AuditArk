import { useCallback, useMemo, useState } from 'react';
import type { ReceiptData } from '../components/PushBatchButton';
import type { ReceiptFile } from './useFileUpload';

export type TableStatus = 'pending' | 'edited' | 'approved' | 'rejected' | string;

export type EditableField = 'vendor' | 'date' | 'invoice_no' | 'hostel_no' | 'amount' | 'tax' | 'total';

export type TableRowData = {
  id: string;
  status: TableStatus;
  vendor: string;
  date: string;
  invoice_no: string;
  hostel_no: string;
  amount: string;
  tax: string;
  total: string;
};

export type TableFilters = {
  vendor: string;
  date: string;
  status: 'all' | 'pending' | 'edited' | 'approved' | 'rejected';
};

export type SortKey = 'vendor' | 'date' | 'invoice_no' | 'hostel_no' | 'amount' | 'tax' | 'total' | 'status';
export type SortOrder = 'asc' | 'desc';

type UseTableArgs = {
  files: ReceiptFile[];
  receiptDataMap: Record<string, ReceiptData>;
  onCellChange: (id: string, field: EditableField, value: string) => void;
};

const EMPTY_RECEIPT: ReceiptData = {
  vendor: '',
  date: '',
  invoice_no: '',
  amount: '',
  tax: '',
  total: '',
  hostel_no: '',
  account_no: '',
  ifsc: '',
  remarks: '',
};

const NUMERIC_KEYS: ReadonlySet<SortKey> = new Set(['hostel_no', 'amount', 'tax', 'total']);

const toRow = (file: ReceiptFile, receiptDataMap: Record<string, ReceiptData>, editedIds: ReadonlySet<string>): TableRowData => {
  const draft = receiptDataMap[file.id] ?? EMPTY_RECEIPT;
  const status: TableStatus = editedIds.has(file.id) && file.status === 'pending' ? 'edited' : file.status;

  return {
    id: file.id,
    status,
    vendor: draft.vendor ?? '',
    date: draft.date ?? '',
    invoice_no: draft.invoice_no ?? '',
    hostel_no: draft.hostel_no ?? '',
    amount: draft.amount ?? '',
    tax: draft.tax ?? '',
    total: draft.total ?? '',
  };
};

export const useTable = ({ files, receiptDataMap, onCellChange }: UseTableArgs) => {
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<TableFilters>({ vendor: '', date: '', status: 'all' });
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const rows = useMemo(() => files.map(file => toRow(file, receiptDataMap, editedIds)), [files, receiptDataMap, editedIds]);

  const setSort = useCallback((key: SortKey) => {
    setSortKey(currentKey => {
      if (currentKey === key) {
        setSortOrder(currentOrder => (currentOrder === 'asc' ? 'desc' : 'asc'));
        return currentKey;
      }
      setSortOrder('asc');
      return key;
    });
  }, []);

  const updateCell = useCallback((id: string, field: EditableField, value: string) => {
    onCellChange(id, field, value);

    const file = files.find(item => item.id === id);
    if (file?.status === 'pending') {
      setEditedIds(prev => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  }, [files, onCellChange]);

  const filteredRows = useMemo(() => {
    const vendorNeedle = filters.vendor.trim().toLowerCase();
    const dateNeedle = filters.date.trim();
    const statusNeedle = filters.status;

    const filtered = rows.filter(row => {
      if (vendorNeedle && !row.vendor.toLowerCase().includes(vendorNeedle)) return false;
      if (dateNeedle && row.date !== dateNeedle) return false;
      if (statusNeedle !== 'all' && row.status !== statusNeedle) return false;
      return true;
    });

    const direction = sortOrder === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];

      if (NUMERIC_KEYS.has(sortKey)) {
        const leftNum = Number.parseFloat(left);
        const rightNum = Number.parseFloat(right);
        const leftValid = Number.isFinite(leftNum);
        const rightValid = Number.isFinite(rightNum);

        if (!leftValid && !rightValid) return 0;
        if (!leftValid) return 1;
        if (!rightValid) return -1;
        if (leftNum === rightNum) return 0;
        return leftNum > rightNum ? direction : -direction;
      }

      return String(left).localeCompare(String(right), undefined, { sensitivity: 'base' }) * direction;
    });

    return filtered;
  }, [filters, rows, sortKey, sortOrder]);

  return {
    rows,
    filteredRows,
    sortKey,
    sortOrder,
    setSort,
    filters,
    setFilters,
    updateCell,
  };
};
