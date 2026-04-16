import { useParams, useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import { ArrowLeft } from 'lucide-react';

export default function StagingUpload() {
  const { id } = useParams();
  const navigate = useNavigate();
  const batchId = id ? parseInt(id) : undefined;

  if (!batchId || isNaN(batchId)) {
    return (
      <div className="p-8 text-center text-red-500">
        Invalid batch ID
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-6 pt-4 pb-2 border-b border-slate-200 shrink-0">
        <button
          onClick={() => navigate('/batches')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Batches
        </button>
        <h1 className="text-xl font-bold text-primary">
          Batch #{batchId} — Stage &amp; Review
        </h1>
      </div>
      <div className="flex-1 overflow-auto">
        <FileUpload batchId={batchId} />
      </div>
    </div>
  );
}
