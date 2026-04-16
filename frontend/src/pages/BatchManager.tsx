import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBatches, useCreateBatch } from '../hooks/useBatches';
import { FolderPlus, X, Eye, Upload } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { useModal } from '../components/modal/useModal';

export default function BatchManager() {
  const navigate = useNavigate();
  const { data: batches, isLoading } = useBatches();
  const createBatch = useCreateBatch();
  const { openConfirm } = useModal();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchFolder, setNewBatchFolder] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBatch.mutate(
      { name: newBatchName, source_folder: newBatchFolder },
      {
        onSuccess: (batch) => {
          setIsModalOpen(false);
          setNewBatchName('');
          setNewBatchFolder('');
          // Navigate directly to staging for the new batch
          navigate(`/batches/${batch.id}/stage`);
        },
        onError: () => openConfirm({
          title: 'Create batch failed',
          message: 'Failed to create batch.',
          confirmText: 'Close',
          cancelText: 'Close',
          onConfirm: () => {},
        })
      }
    );
  };

  const handleStageClick = (batchId: number) => {
    navigate(`/batches/${batchId}/stage`);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 shrink-0">
        <h1 className="text-2xl font-bold text-primary">Batch Manager</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-[#153a5c] text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 transition-colors shadow-sm font-medium"
        >
          <FolderPlus size={20} />
          <span>Create Batch</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {batches?.map(batch => {
          const count = batch.receipt_count ?? 0;

          return (
            <div
              key={batch.id}
              className="bg-white border-2 p-6 rounded-xl shadow-sm transition-all flex flex-col border-slate-200 hover:shadow-md"
            >
              {/* Clickable header — navigates to batch view */}
              <div
                className="flex-1 cursor-pointer group"
                onClick={() => navigate(`/receipts?batch_id=${batch.id}`)}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-lg text-slate-800 truncate group-hover:text-primary transition-colors" title={batch.name}>{batch.name}</h3>
                  {count > 0 && (
                    <Eye size={16} className="text-slate-300 group-hover:text-primary shrink-0 ml-2 transition-colors" />
                  )}
                </div>
                <p className="text-sm text-slate-500 mb-2 truncate" title={batch.source_folder ?? ''}>
                  <span className="font-medium text-slate-600">Source:</span> {batch.source_folder || 'N/A'}
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  <span className="font-medium text-slate-600">Created:</span> {formatDate(batch.created_at?.split(" ")[0])}
                </p>
              </div>

              {/* Stage & Review action area */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 mb-4 text-center">
                <p className="text-xs text-slate-400 mb-3 font-medium">Add receipts, preview, edit, and push to database</p>
                <button
                  onClick={() => handleStageClick(batch.id)}
                  className="flex items-center justify-center gap-2 mx-auto text-sm bg-primary text-white px-5 py-2 rounded-lg font-medium hover:bg-[#153a5c] transition-colors"
                >
                  <Upload size={16} />
                  <span>Stage &amp; Review</span>
                </button>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  onClick={() => navigate(`/receipts?batch_id=${batch.id}`)}
                  className="text-sm font-semibold bg-[#F2F7FB] text-primary px-3 py-1.5 rounded-full hover:bg-primary hover:text-white transition-colors"
                >
                  {count} Receipt{count !== 1 ? 's' : ''} — View
                </button>
                <div className="flex gap-1">
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    JPG, PNG, WebP, BMP
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {batches?.length === 0 && (
          <div className="col-span-full py-16 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            <FolderPlus className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No batches found</h3>
            <p className="text-slate-500 mb-4">Create a batch and upload receipt images for processing.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-primary hover:text-[#153a5c] font-medium transition-colors"
            >
              Create your first batch
            </button>
          </div>
        )}
      </div>

      {/* Create Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">Create New Batch</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors bg-white p-1 rounded-full shadow-sm">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Batch Name</label>
                  <input
                    required
                    type="text"
                    value={newBatchName}
                    onChange={e => setNewBatchName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400"
                    placeholder="e.g. Feb 2026 Scans"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Source Folder Path (optional)</label>
                  <input
                    type="text"
                    value={newBatchFolder}
                    onChange={e => setNewBatchFolder(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400"
                    placeholder="e.g. C:\Scans\Feb2026"
                  />
                </div>
              </div>
              <div className="mt-8 flex space-x-3 justify-end pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBatch.isPending}
                  className="bg-primary hover:bg-[#153a5c] text-white px-6 py-2.5 rounded-xl font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                  {createBatch.isPending ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
