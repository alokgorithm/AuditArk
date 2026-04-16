import type { ReceiptFile } from '../hooks/useFileUpload';

type StatusBadgeProps = {
  status: ReceiptFile['status'];
  compact?: boolean;
};

const StatusBadge = ({ status, compact = false }: StatusBadgeProps) => {
  switch (status) {
    case 'pending':
      return compact ? (
        <span className="w-2 h-2 rounded-full bg-slate-400 shadow-sm shadow-black/50" title="Pending" />
      ) : (
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
          Pending
        </span>
      );
    case 'processing':
      return compact ? (
        <span className="w-2.5 h-2.5 border border-blue-500 border-t-white rounded-full animate-spin shadow-sm shadow-black/50" title="Processing" />
      ) : (
        <span className="flex items-center gap-1 text-xs text-blue-500">
          <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
          Processing
        </span>
      );
    case 'extracted':
      return compact ? (
        <span className="w-2 h-2 rounded-full bg-yellow-400 border border-yellow-600 shadow-sm shadow-black/50" title="Extracted" />
      ) : (
        <span className="flex items-center gap-1 text-xs text-yellow-500">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          Extracted
        </span>
      );
    case 'reviewed':
    case 'approved':
      return compact ? (
        <span className="w-2 h-2 rounded-full bg-green-500 border border-green-700 shadow-sm shadow-black/50" title={status === 'approved' ? 'Approved' : 'Reviewed'} />
      ) : (
        <span className="flex items-center gap-1 text-xs text-green-500">
          <span className="text-green-500">✓</span>
          {status === 'approved' ? 'Approved' : 'Reviewed'}
        </span>
      );
    case 'rejected':
      return compact ? (
        <span className="text-[10px] font-bold text-red-500 drop-shadow-md" title="Rejected">✕</span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <span>✕</span>
          Rejected
        </span>
      );
    case 'error':
      return compact ? (
        <span className="text-[10px] font-bold text-red-500 drop-shadow-md" title="Error">❌</span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <span>❌</span>
          Error
        </span>
      );
    default:
      return null;
  }
};

export default StatusBadge;
