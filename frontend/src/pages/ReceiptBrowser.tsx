import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useReceipts, useBulkDelete } from '../hooks/useReceipts';
import type { ReceiptQueryParams } from '../hooks/useReceipts';
import { FilterBar } from '../components/FilterBar';
import type { FilterState } from '../components/FilterBar';
import { ImageStrip } from '../components/ImageStrip';
import { DataTable } from '../components/DataTable';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { Receipt } from '../types';
import { FileSpreadsheet, FileText, Trash2, ArrowLeft } from 'lucide-react';
import { apiClient } from '../api/client';
import { useModal } from '../components/modal/useModal';

export default function ReceiptBrowser() {
  const [searchParams] = useSearchParams();
  const batchIdParam = searchParams.get('batch_id');
  const [filters, setFilters] = useState<FilterState>(() =>
    batchIdParam ? { batch_id: Number(batchIdParam) } : {}
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { data, isLoading } = useReceipts(filters as ReceiptQueryParams);
  const bulkDelete = useBulkDelete();
  const navigate = useNavigate();
  const { openConfirm } = useModal();

  // Sync filters when URL batch_id changes
  useEffect(() => {
    if (batchIdParam) {
      setFilters(prev => ({ ...prev, batch_id: Number(batchIdParam) }));
    }
  }, [batchIdParam]);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!data?.receipts) return;
    if (selected.size === data.receipts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.receipts.map(r => r.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    openConfirm({
      title: 'Delete receipts',
      message: `Delete ${selected.size} receipt(s)? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => {
        bulkDelete.mutate([...selected], {
          onSuccess: () => setSelected(new Set()),
        });
      },
    });
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    try {
      const endpoint = type === 'excel' ? '/api/export/excel' : '/api/export/pdf';
      const params: Record<string, unknown> = { ...filters };
      if (type === 'pdf') {
        // Backend requires report_type for PDF exports
        params.report_type = filters.vendor ? 'vendor' : 'monthly';
      }
      
      const response = await apiClient.get(endpoint, { 
        params, 
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipts_export.${type === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e) {
      openConfirm({
        title: 'Export failed',
        message: `Failed to export ${type}.`,
        confirmText: 'Close',
        cancelText: 'Close',
        onConfirm: () => {},
      });
    }
  };

  const columns = [
    {
      key: '_select',
      header: '✓',
      render: (r: Receipt) => (
        <input
          type="checkbox"
          checked={selected.has(r.id)}
          onChange={(e) => { e.stopPropagation(); toggleSelect(r.id); }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 accent-primary cursor-pointer"
        />
      ),
    },
    { key: 'date', header: 'Date', sortable: true, render: (r: Receipt) => formatDate(r.date) },
    { key: 'vendor', header: 'Vendor', sortable: true, render: (r: Receipt) => <span className="font-medium text-slate-800">{r.vendor || 'Unknown'}</span> },
    { key: 'invoice_no', header: 'Invoice No', sortable: true },
    { key: 'hostel_no', header: 'Hostel No.', sortable: true },
    { key: 'amount', header: 'Amount', sortable: true, render: (r: Receipt) => formatCurrency(r.amount) },
    { key: 'tax', header: 'Tax', sortable: true, render: (r: Receipt) => formatCurrency(r.tax) },
    { key: 'total', header: 'Total', sortable: true, render: (r: Receipt) => <span className="font-semibold text-slate-900">{formatCurrency(r.total)}</span> },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'status', header: 'Status', sortable: true, render: (r: Receipt) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        r.status === 'reviewed' ? 'bg-emerald-100 text-emerald-700' :
        r.status === 'locked' ? 'bg-purple-100 text-purple-700' :
        r.status === 'processing' ? 'bg-blue-100 text-blue-700' :
        r.status === 'pending' ? 'bg-slate-100 text-slate-600' :
        'bg-amber-100 text-amber-700'
      }`}>{r.status}</span>
    )},
  ];

  const isBatchView = !!filters.batch_id;
  const receipts = data?.receipts || [];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Image strip at top when viewing a batch */}
      {isBatchView && receipts.length > 0 && (
        <ImageStrip
          receipts={receipts}
          activeId={undefined}
          onSelect={(id) => navigate(`/receipts/${id}`)}
        />
      )}

      <div className="p-8 flex-1 flex flex-col space-y-6 overflow-auto">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {isBatchView && (
            <button
              onClick={() => navigate('/batches')}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary font-medium transition-colors"
            >
              <ArrowLeft size={16} /> Batches
            </button>
          )}
          <h1 className="text-2xl font-bold text-primary">
            {isBatchView ? `Batch #${filters.batch_id} — Receipts` : 'Receipt Context Engine'}
          </h1>
        </div>
      </div>

      <FilterBar 
        filters={filters} 
        onChange={setFilters} 
        onClear={() => setFilters(batchIdParam ? { batch_id: Number(batchIdParam) } : {})}
      >
        <button 
          onClick={() => handleExport('excel')}
          className="flex items-center space-x-2 text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors border border-emerald-200"
        >
          <FileSpreadsheet size={16} />
          <span>Export Excel</span>
        </button>
        <button 
          onClick={() => handleExport('pdf')}
          className="flex items-center space-x-2 text-sm bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors border border-red-200"
        >
          <FileText size={16} />
          <span>Export PDF</span>
        </button>
      </FilterBar>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex justify-between items-center mb-4 px-1">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-slate-700">
              Showing <span className="text-primary">{data?.count ?? 0}</span> receipts
            </h2>
            {data && data.receipts.length > 0 && (
              <button onClick={toggleAll} className="text-xs text-primary hover:underline font-medium">
                {selected.size === data.receipts.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDelete.isPending}
              className="flex items-center gap-1.5 text-sm bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium border border-red-200 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              Delete {selected.size} selected
            </button>
          )}
        </div>
        <div className="flex-1 overflow-auto rounded-xl">
          <DataTable 
            data={data?.receipts || []} 
            columns={columns} 
            onRowClick={(row) => navigate(`/receipts/${row.id}`)}
            isLoading={isLoading}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
