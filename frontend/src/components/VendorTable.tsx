import type { Vendor } from '../types';

type VendorTableProps = {
  vendors: Vendor[];
  search: string;
  onSearchChange: (value: string) => void;
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
};

const VendorTable = ({ vendors, search, onSearchChange, onEdit, onDelete }: VendorTableProps) => {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-3">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search vendor"
          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-200 focus:ring-2"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-600">
            <tr>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2">Bank</th>
              <th className="px-3 py-2">Account No</th>
              <th className="px-3 py-2">IFSC</th>
              <th className="px-3 py-2 text-right">Default Amount</th>
              <th className="px-3 py-2">Remarks</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-500">No vendors found</td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr key={vendor.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{vendor.name}</td>
                  <td className="px-3 py-2">{vendor.bank_name || '-'}</td>
                  <td className="px-3 py-2">{vendor.account_no || '-'}</td>
                  <td className="px-3 py-2">{vendor.ifsc || '-'}</td>
                  <td className="px-3 py-2 text-right">{vendor.default_amount ?? 0}</td>
                  <td className="max-w-[260px] truncate px-3 py-2" title={vendor.remarks || ''}>{vendor.remarks || '-'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(vendor)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(vendor)}
                        className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VendorTable;
