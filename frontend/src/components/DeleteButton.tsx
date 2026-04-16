import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useModal } from './modal/useModal';
import { useToast } from '../hooks/useToast';

type DeleteButtonProps = {
  selectedIds: string[];
  onDeleteSuccess: (ids: string[]) => void;
  onClearSelection: () => void;
};

const DeleteButton = ({ selectedIds, onDeleteSuccess, onClearSelection }: DeleteButtonProps) => {
  const { openConfirm } = useModal();
  const { addToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const performDelete = async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    try {
      // Local-only delete — removes files from staging state
      onDeleteSuccess(selectedIds);
      onClearSelection();
      addToast(`${selectedIds.length} receipt(s) removed from staging`, 'success');
    } catch {
      addToast('Delete failed', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      disabled={selectedIds.length === 0 || isDeleting}
      onClick={() => {
        openConfirm({
          title: 'Remove selected receipts?',
          message: 'Receipts will be removed from staging. This does not affect already-pushed data.',
          confirmText: 'Remove',
          cancelText: 'Cancel',
          onConfirm: () => {
            void performDelete();
          },
        });
      }}
      className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Trash2 size={14} />
      {isDeleting ? 'Removing...' : `Remove (${selectedIds.length})`}
    </button>
  );
};

export default DeleteButton;
