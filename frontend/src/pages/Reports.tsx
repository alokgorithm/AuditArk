import { useState } from 'react';
import { useVendors } from '../hooks/useVendors';
import { useVendorReport, useMonthlyReport, useHostelReport, useYearlyReport } from '../hooks/useReports';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { apiClient } from '../api/client';
import { useModal } from '../components/modal/useModal';

type ReportType = 'vendor' | 'monthly' | 'hostel' | 'yearly';

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('vendor');
  const [vendor, setVendor] = useState<string>('');
  const [month, setMonth] = useState<number | ''>('');
  const [year, setYear] = useState<number | ''>('');
  const [hostelNo, setHostelNo] = useState<number | ''>('');

  const { data: vendorsData } = useVendors();
  const { openConfirm } = useModal();

  const vendorReport = useVendorReport(reportType === 'vendor' ? vendor : undefined, month || undefined, year || undefined);
  const monthlyReport = useMonthlyReport(reportType === 'monthly' ? (month || undefined) : undefined, reportType === 'monthly' ? (year || undefined) : undefined);
  const hostelReport = useHostelReport(reportType === 'hostel' ? (hostelNo || undefined) : undefined, reportType === 'hostel' ? (month || undefined) : undefined, reportType === 'hostel' ? (year || undefined) : undefined);
  const yearlyReport = useYearlyReport(reportType === 'yearly' ? (year || undefined) : undefined);

  const isFormValid = () => {
    if (reportType === 'vendor') return !!vendor;
    if (reportType === 'monthly') return !!month && !!year;
    if (reportType === 'hostel') return !!hostelNo && !!month && !!year;
    if (reportType === 'yearly') return !!year;
    return false;
  };

  const currentLoading = vendorReport.isFetching || monthlyReport.isFetching || hostelReport.isFetching || yearlyReport.isFetching;

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!isFormValid()) {
      openConfirm({
        title: 'Missing required fields',
        message: 'Please fill required fields.',
        confirmText: 'Close',
        cancelText: 'Close',
        onConfirm: () => {},
      });
      return;
    }
    try {
      const endpoint = format === 'pdf' ? '/api/export/pdf' : '/api/export/excel';
      const params: Record<string, unknown> = {};
      if (format === 'pdf') params.report_type = reportType;
      if (vendor) params.vendor = vendor;
      if (month) params.month = month;
      if (year) params.year = year;
      if (hostelNo) params.hostel_no = hostelNo;

      const response = await apiClient.get(endpoint, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      openConfirm({
        title: 'Export failed',
        message: `Export failed for ${format}.`,
        confirmText: 'Close',
        cancelText: 'Close',
        onConfirm: () => {},
      });
    }
  };

  return (
    <div className="p-8 h-full flex flex-col space-y-6 overflow-auto">
      <h1 className="text-2xl font-bold text-primary">Financial Reports</h1>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex flex-wrap gap-3 mb-6">
          {(['vendor', 'monthly', 'hostel', 'yearly'] as ReportType[]).map(type => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-5 py-2.5 rounded-lg font-medium transition-colors capitalize border ${reportType === type ? 'bg-primary border-primary text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'}`}
            >
              {type} Report
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {reportType === 'vendor' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vendor *</label>
              <select value={vendor} onChange={e => setVendor(e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Select Vendor...</option>
                {vendorsData?.map(v => <option key={v.id} value={v.canonical_name}>{v.canonical_name}</option>)}
              </select>
            </div>
          )}

          {(reportType === 'monthly' || reportType === 'hostel' || reportType === 'vendor') && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Month {reportType !== 'vendor' && '*'}</label>
              <select value={month} onChange={e => setMonth(e.target.value ? parseInt(e.target.value) : '')} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Select Month</option>
                {MONTH_NAMES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Year {reportType !== 'vendor' && '*'}</label>
            <input type="number" placeholder="YYYY" value={year} onChange={e => setYear(e.target.value ? parseInt(e.target.value) : '')} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          {reportType === 'hostel' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hostel No *</label>
              <input type="number" placeholder="e.g. 1" value={hostelNo} onChange={e => setHostelNo(e.target.value ? parseInt(e.target.value) : '')} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          )}
        </div>

        <div className="flex space-x-3 mt-8 pt-6 border-t border-slate-100">
          <button onClick={() => handleExport('excel')} disabled={!isFormValid()} className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-100 disabled:opacity-50 transition-colors shadow-sm">
            <FileSpreadsheet size={18} /> <span>Export Excel</span>
          </button>
          <button onClick={() => handleExport('pdf')} disabled={!isFormValid()} className="flex items-center space-x-2 bg-red-50 text-red-700 border border-red-200 px-5 py-2.5 rounded-lg font-medium hover:bg-red-100 disabled:opacity-50 transition-colors shadow-sm">
            <FileText size={18} /> <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Report Results */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl p-8 overflow-auto shadow-sm">
        {currentLoading ? (
          <div className="flex justify-center items-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : !isFormValid() ? (
          <div className="flex justify-center items-center h-48 text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-xl p-8">
            Fill all required fields to preview the report.
          </div>
        ) : (
          <>
            {/* VENDOR REPORT */}
            {reportType === 'vendor' && vendorReport.data && (
              <div className="space-y-8">
                <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4">
                  Vendor Report: <span className="text-primary">{vendorReport.data.vendor}</span>
                </h3>

                {/* All Entries */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-3">All Entries ({vendorReport.data.all_entries.length})</h4>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-[#1F4E79] text-white">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Date</th>
                          <th className="px-4 py-3 text-left font-semibold">Invoice No</th>
                          <th className="px-4 py-3 text-center font-semibold">Hostel</th>
                          <th className="px-4 py-3 text-right font-semibold">Amount</th>
                          <th className="px-4 py-3 text-right font-semibold">Tax</th>
                          <th className="px-4 py-3 text-right font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {vendorReport.data.all_entries.map((e, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F2F7FB]/50'}>
                            <td className="px-4 py-3">{formatDate(e.date)}</td>
                            <td className="px-4 py-3">{e.invoice_no}</td>
                            <td className="px-4 py-3 text-center">{e.hostel_no}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(e.amount)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(e.tax)}</td>
                            <td className="px-4 py-3 text-right font-semibold">{formatCurrency(e.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Monthly Summary */}
                {vendorReport.data.monthly_summary.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-700 mb-3">Monthly Summary</h4>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-[#1F4E79] text-white">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Month</th>
                            <th className="px-4 py-3 text-right font-semibold">Amount</th>
                            <th className="px-4 py-3 text-right font-semibold">Tax</th>
                            <th className="px-4 py-3 text-right font-semibold">Grand Total</th>
                            <th className="px-4 py-3 text-center font-semibold">Entries</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vendorReport.data.monthly_summary.map((m, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F2F7FB]/50'}>
                              <td className="px-4 py-3 font-medium">{m.month}</td>
                              <td className="px-4 py-3 text-right">{formatCurrency(m.total_amount)}</td>
                              <td className="px-4 py-3 text-right">{formatCurrency(m.total_tax)}</td>
                              <td className="px-4 py-3 text-right font-semibold">{formatCurrency(m.grand_total)}</td>
                              <td className="px-4 py-3 text-center">{m.entries}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Final Summary */}
                <div className="bg-[#F2F7FB] border border-primary/10 rounded-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Total Amount</p>
                    <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(vendorReport.data.final_summary.total_amount)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Total Tax</p>
                    <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(vendorReport.data.final_summary.total_tax)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Grand Total</p>
                    <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(vendorReport.data.final_summary.grand_total)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Entries</p>
                    <p className="text-xl font-bold text-slate-800 mt-1">{vendorReport.data.final_summary.total_entries}</p>
                  </div>
                </div>
              </div>
            )}

            {/* MONTHLY REPORT */}
            {reportType === 'monthly' && monthlyReport.data && (
              <div className="space-y-8">
                <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4">
                  Monthly Report: <span className="text-primary">{MONTH_NAMES[monthlyReport.data.month]} {monthlyReport.data.year}</span>
                </h3>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-[#1F4E79] text-white">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Vendor</th>
                        <th className="px-4 py-3 text-right font-semibold">Amount</th>
                        <th className="px-4 py-3 text-right font-semibold">Tax</th>
                        <th className="px-4 py-3 text-right font-semibold">Grand Total</th>
                        <th className="px-4 py-3 text-center font-semibold">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyReport.data.vendors.map((v, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F2F7FB]/50'}>
                          <td className="px-4 py-3 font-medium">{v.vendor}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(v.total_amount)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(v.total_tax)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(v.grand_total)}</td>
                          <td className="px-4 py-3 text-center">{v.count}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold">
                        <td className="px-4 py-3">TOTAL</td>
                        <td className="px-4 py-3 text-right"></td>
                        <td className="px-4 py-3 text-right"></td>
                        <td className="px-4 py-3 text-right text-primary">{formatCurrency(monthlyReport.data.grand_total)}</td>
                        <td className="px-4 py-3 text-center">{monthlyReport.data.total_entries}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* HOSTEL REPORT */}
            {reportType === 'hostel' && hostelReport.data && (
              <div className="space-y-8">
                <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4">
                  Hostel {hostelReport.data.hostel_no} — <span className="text-primary">{MONTH_NAMES[hostelReport.data.month]} {hostelReport.data.year}</span>
                </h3>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-[#1F4E79] text-white">
                      <tr>
                        <th className="px-4 py-3 text-center font-semibold w-12">Sr</th>
                        <th className="px-4 py-3 text-left font-semibold">Vendor Name</th>
                        <th className="px-4 py-3 text-left font-semibold">Account No</th>
                        <th className="px-4 py-3 text-left font-semibold">IFSC</th>
                        <th className="px-4 py-3 text-right font-semibold">Amount</th>
                        <th className="px-4 py-3 text-left font-semibold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hostelReport.data.rows.map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F2F7FB]/50'}>
                          <td className="px-4 py-3 text-center">{r.sr}</td>
                          <td className="px-4 py-3 font-medium">{r.vendor_name}</td>
                          <td className="px-4 py-3 font-mono text-xs">{r.account_no}</td>
                          <td className="px-4 py-3 font-mono text-xs">{r.ifsc}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(r.amount)}</td>
                          <td className="px-4 py-3">{r.remarks}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold">
                        <td className="px-4 py-3" colSpan={4} >TOTAL</td>
                        <td className="px-4 py-3 text-right text-primary">{formatCurrency(hostelReport.data.grand_total)}</td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* YEARLY REPORT */}
            {reportType === 'yearly' && yearlyReport.data && (
              <div className="space-y-8">
                <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4">
                  Yearly Report: <span className="text-primary">{yearlyReport.data.year}</span>
                </h3>

                {/* Vendor Summary */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-3">Vendor Summary</h4>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-[#1F4E79] text-white">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Vendor</th>
                          <th className="px-4 py-3 text-right font-semibold">Amount</th>
                          <th className="px-4 py-3 text-right font-semibold">Tax</th>
                          <th className="px-4 py-3 text-right font-semibold">Grand Total</th>
                          <th className="px-4 py-3 text-center font-semibold">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {yearlyReport.data.vendor_summary.map((v, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F2F7FB]/50'}>
                            <td className="px-4 py-3 font-medium">{v.vendor}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(v.total_amount)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(v.total_tax)}</td>
                            <td className="px-4 py-3 text-right font-semibold">{formatCurrency(v.grand_total)}</td>
                            <td className="px-4 py-3 text-center">{v.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Category Summary */}
                {yearlyReport.data.category_summary.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-700 mb-3">Category Summary</h4>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-[#1F4E79] text-white">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Category</th>
                            <th className="px-4 py-3 text-right font-semibold">Total</th>
                            <th className="px-4 py-3 text-center font-semibold">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {yearlyReport.data.category_summary.map((c, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F2F7FB]/50'}>
                              <td className="px-4 py-3 font-medium">{c.category}</td>
                              <td className="px-4 py-3 text-right font-semibold">{formatCurrency(c.total)}</td>
                              <td className="px-4 py-3 text-center">{c.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Monthly Trend */}
                {yearlyReport.data.monthly_trend.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-700 mb-3">Monthly Trend</h4>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-[#1F4E79] text-white">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Month</th>
                            <th className="px-4 py-3 text-right font-semibold">Amount</th>
                            <th className="px-4 py-3 text-right font-semibold">Tax</th>
                            <th className="px-4 py-3 text-right font-semibold">Grand Total</th>
                            <th className="px-4 py-3 text-center font-semibold">Entries</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {yearlyReport.data.monthly_trend.map((m, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F2F7FB]/50'}>
                              <td className="px-4 py-3 font-medium">{MONTH_NAMES[m.month]}</td>
                              <td className="px-4 py-3 text-right">{formatCurrency(m.total_amount)}</td>
                              <td className="px-4 py-3 text-right">{formatCurrency(m.total_tax)}</td>
                              <td className="px-4 py-3 text-right font-semibold">{formatCurrency(m.grand_total)}</td>
                              <td className="px-4 py-3 text-center">{m.entries}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Grand Total */}
                <div className="bg-[#F2F7FB] border border-primary/10 rounded-xl p-6 flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-700">Year {yearlyReport.data.year} Grand Total</span>
                  <span className="text-3xl font-bold text-primary">{formatCurrency(yearlyReport.data.grand_total)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
