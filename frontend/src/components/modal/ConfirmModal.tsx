import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  secondaryText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onSecondary?: () => void;
  onCancel: () => void;
};

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  secondaryText,
  cancelText = 'Cancel',
  onConfirm,
  onSecondary,
  onCancel,
}: ConfirmModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-amber-100 p-2 text-amber-700">
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {cancelText}
          </button>
          {secondaryText && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
            >
              {secondaryText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-[#1F4E79] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#163b5c]"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;