import { useState } from 'react';
import { useVendors, useMergeVendors } from '../hooks/useVendors';
import { DataTable } from '../components/DataTable';
import type { Vendor } from '../types';
import { useModal } from '../components/modal/useModal';

export default function VendorManager() {
  const { data: vendors, isLoading } = useVendors();
  const mergeVendors = useMergeVendors();
  const { openConfirm } = useModal();
  
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [sourceId, setSourceId] = useState<number | ''>('');
  const [targetId, setTargetId] = useState<number | ''>('');

  const handleMergeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId || sourceId === targetId) {
      openConfirm({
        title: 'Invalid selection',
        message: 'Select distinct vendors.',
        confirmText: 'Close',
        cancelText: 'Close',
        onConfirm: () => {},
      });
      return;
    }
    
    mergeVendors.mutate(
      { source_vendor_id: sourceId as number, target_vendor_id: targetId as number },
      {
        onSuccess: (data: any) => {
          openConfirm({
            title: 'Merge complete',
            message: `Merged successfully. ${data.updated_count || 'Several'} receipts updated.`,
            confirmText: 'Close',
            cancelText: 'Close',
            onConfirm: () => {},
          });
          setIsMergeModalOpen(false);
          setSourceId('');
          setTargetId('');
        },
        onError: () => openConfirm({
          title: 'Merge failed',
          message: 'Merge failed. Please try again.',
          confirmText: 'Close',
          cancelText: 'Close',
          onConfirm: () => {},
        })
      }
    );
  };

  const columns = [
    { key: 'canonical_name', header: 'Canonical Name', sortable: true },
    { key: 'aliases', header: 'Aliases', render: (v: Vendor) => {
      if (!v.aliases) return '-';
      try {
        const arr = typeof v.aliases === 'string' ? JSON.parse(v.aliases) : v.aliases;
        return Array.isArray(arr) && arr.length > 0 ? arr.join(', ') : '-';
      } catch { return '-'; }
    }},
    { key: 'account_no', header: 'Account No', sortable: true },
    { key: 'ifsc', header: 'IFSC Code', sortable: true },
  ];

  return (
    <div className="p-8 h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Vendor Management</h1>
        <button 
          onClick={() => setIsMergeModalOpen(true)}
          className="bg-primary hover:bg-[#153a5c] text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors"
        >
          Merge Vendors
        </button>
      </div>

      <div className="flex-1 overflow-auto rounded-xl">
        <DataTable data={vendors || []} columns={columns} isLoading={isLoading} />
      </div>

      {isMergeModalOpen && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 shrink-0 transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
               <h2 className="text-xl font-bold text-slate-800">Merge Vendors</h2>
            </div>
            <form onSubmit={handleMergeSubmit} className="p-6 space-y-5">
              <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5">Source Vendor (Will be removed)</label>
                 <select 
                    required 
                    value={sourceId} 
                    onChange={e => setSourceId(parseInt(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                 >
                   <option value="">Select Vendor...</option>
                   {vendors?.map(v => <option key={`source-${v.id}`} value={v.id}>{v.canonical_name}</option>)}
                 </select>
                 <p className="text-xs text-red-500 mt-2">This vendor's aliases will be transferred to target.</p>
              </div>
              <div className="pt-2">
                 <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Vendor (Will be kept)</label>
                 <select 
                    required 
                    value={targetId} 
                    onChange={e => setTargetId(parseInt(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                 >
                   <option value="">Select Target...</option>
                   {vendors?.map(v => <option disabled={v.id === sourceId} key={`target-${v.id}`} value={v.id}>{v.canonical_name}</option>)}
                 </select>
                 <p className="text-xs text-slate-500 mt-2">All receipts will be reassigned to this vendor.</p>
              </div>
              <div className="mt-8 flex space-x-3 justify-end pt-4 border-t border-slate-100">
                 <button type="button" onClick={() => setIsMergeModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                 <button type="submit" disabled={mergeVendors.isPending} className="bg-primary hover:bg-[#153a5c] text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50">
                    {mergeVendors.isPending ? 'Merging...' : 'Confirm Merge'}
                 </button>
              </div>
            </form>
          </div>
         </div>
      )}
    </div>
  );
}
