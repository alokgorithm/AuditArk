import { useReceipts } from '../hooks/useReceipts';
import { useBatches } from '../hooks/useBatches';
import { useVendors } from '../hooks/useVendors';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Receipt, Folder, Users, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const { data: receiptsData, isLoading: loadingReceipts } = useReceipts({});
  const { data: batches, isLoading: loadingBatches } = useBatches();
  const { data: vendors, isLoading: loadingVendors } = useVendors();

  const totalReceipts = receiptsData?.count || 0;
  const totalBatches = batches?.length || 0;
  const totalVendors = vendors?.length || 0;
  const grandTotal = receiptsData?.receipts?.reduce((sum, r) => sum + (r.total || 0), 0) || 0;

  const recentBatches = batches ? [...batches].reverse().slice(0, 5) : [];

  const isLoading = loadingReceipts || loadingBatches || loadingVendors;

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Receipts", value: totalReceipts, icon: <Receipt className="text-blue-500" size={24} /> },
    { title: "Total Batches", value: totalBatches, icon: <Folder className="text-orange-500" size={24} /> },
    { title: "Total Vendors", value: totalVendors, icon: <Users className="text-emerald-500" size={24} /> },
    { title: "Grand Total", value: `₹${formatCurrency(grandTotal)}`, icon: <DollarSign className="text-purple-500" size={24} /> },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-primary">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center space-x-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Recent Batches</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#1F4E79] text-white">
              <tr>
                <th className="px-6 py-4 font-semibold">Batch Name</th>
                <th className="px-6 py-4 font-semibold">Source Folder</th>
                <th className="px-6 py-4 font-semibold">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentBatches.length > 0 ? (
                recentBatches.map(batch => (
                  <tr key={batch.id} className="hover:bg-[#F2F7FB] transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{batch.name}</td>
                    <td className="px-6 py-4">{batch.source_folder}</td>
                    <td className="px-6 py-4">{formatDate(batch.created_at?.split(" ")[0])}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    No batches found. Create a batch to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
