import { useState } from 'react';
import { FilterBar } from '../components/FilterBar';
import type { FilterState } from '../components/FilterBar';
import { useReceipts } from '../hooks/useReceipts';
import type { ReceiptQueryParams } from '../hooks/useReceipts';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { apiClient } from '../api/client';
import { formatCurrency } from '../utils/formatters';
import { useModal } from '../components/modal/useModal';

export default function Exports() {
  const [filters, setFilters] = useState<FilterState>({});
  const [pdfReportType, setPdfReportType] = useState<string>('monthly');
  const { data, isLoading } = useReceipts(filters as ReceiptQueryParams);
  const { openConfirm } = useModal();

  const grandTotal = data?.receipts?.reduce((sum, r) => sum + (r.total || 0), 0) || 0;

  const handleDownload = async (endpoint: string, params: Record<string, unknown>, filename: string) => {
    try {
      const response = await apiClient.get(endpoint, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      openConfirm({
        title: 'Export failed',
        message: 'Export failed. Check that required filters are set.',
        confirmText: 'Close',
        cancelText: 'Close',
        onConfirm: () => {},
      });
    }
  };

  const handleExcelExport = () => {
    handleDownload('/api/export/excel', { ...filters }, `receipts_export_${Date.now()}.xlsx`);
  };

  const handlePdfExport = () => {
    const params: Record<string, unknown> = { report_type: pdfReportType, ...filters };
    handleDownload('/api/export/pdf', params, `${pdfReportType}_report_${Date.now()}.pdf`);
  };

  const pdfReady = () => {
    if (pdfReportType === 'vendor') return !!filters.vendor;
    if (pdfReportType === 'monthly') return !!filters.month && !!filters.year;
    if (pdfReportType === 'hostel') return !!filters.hostel_no && !!filters.month && !!filters.year;
    return false;
  };

  return (
    <div className="p-8 h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Data Exports</h1>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters({})}
      />

      <div className="flex-1 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-6">Export Preview</h2>
        {isLoading ? (
          <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-xl text-center">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Filtered Records</p>
              <p className="text-4xl font-bold text-primary mt-2">{data?.count ?? 0}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-xl text-center">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Estimated Grand Total</p>
              <p className="text-4xl font-bold text-primary mt-2">{formatCurrency(grandTotal)}</p>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-slate-100 space-y-6">
          {/* Excel — always available */}
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-5 rounded-xl">
            <div>
              <h3 className="font-bold text-emerald-800">Excel Export</h3>
              <p className="text-sm text-emerald-600">Multi-sheet workbook with all filtered data</p>
            </div>
            <button
              onClick={handleExcelExport}
              disabled={isLoading || data?.count === 0}
              className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <FileSpreadsheet size={20} />
              <span>Download Excel</span>
            </button>
          </div>

          {/* PDF — requires report type selection */}
          <div className="bg-red-50 border border-red-200 p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-red-800">PDF Export</h3>
                <p className="text-sm text-red-600">Select a report type and ensure required filters are set</p>
              </div>
              <button
                onClick={handlePdfExport}
                disabled={!pdfReady()}
                className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <FileText size={20} />
                <span>Download PDF</span>
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <label className="text-sm font-semibold text-red-700">Report Type:</label>
              {(['vendor', 'monthly', 'hostel'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setPdfReportType(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors border ${pdfReportType === t ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-200 hover:bg-red-100'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {!pdfReady() && (
              <p className="text-xs text-red-500 mt-3 font-medium">
                {pdfReportType === 'vendor' && 'Set the Vendor filter above'}
                {pdfReportType === 'monthly' && 'Set Month and Year filters above'}
                {pdfReportType === 'hostel' && 'Set Hostel No, Month, and Year filters above'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
