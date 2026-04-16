import { useEffect, useState } from 'react';
import Modal from './modal/Modal';

export type ExportMode = 'all' | 'approved';

type ExportOptionsModalProps = {
  isOpen: boolean;
  onCancel: () => void;
  onContinue: (mode: ExportMode) => void;
  askEveryTime: boolean;
  defaultPath: string | null;
  onAskEveryTimeChange: (value: boolean) => void;
  onSetDefaultFolder: () => Promise<string | null>;
};

const ExportOptionsModal = ({
  isOpen,
  onCancel,
  onContinue,
  askEveryTime,
  defaultPath,
  onAskEveryTimeChange,
  onSetDefaultFolder,
}: ExportOptionsModalProps) => {
  const [mode, setMode] = useState<ExportMode>('approved');
  const [isSettingFolder, setIsSettingFolder] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMode('approved');
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className="p-6">
        <h2 className="text-lg font-bold text-slate-900">Export Options</h2>

        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input
              type="radio"
              checked={mode === 'all'}
              onChange={() => setMode('all')}
              className="accent-primary"
            />
            <span>Export All Data</span>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input
              type="radio"
              checked={mode === 'approved'}
              onChange={() => setMode('approved')}
              className="accent-primary"
            />
            <span>Export Only Approved</span>
          </label>
        </div>

        <div className="mt-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
            <span>Ask every time</span>
            <input
              type="checkbox"
              checked={askEveryTime}
              onChange={(event) => onAskEveryTimeChange(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </label>

          <div className="text-xs text-slate-500">
            <p className="truncate">Default folder: {defaultPath ?? 'Not set'}</p>
          </div>

          <button
            type="button"
            onClick={async () => {
              setIsSettingFolder(true);
              try {
                await onSetDefaultFolder();
              } finally {
                setIsSettingFolder(false);
              }
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            disabled={isSettingFolder}
          >
            {isSettingFolder ? 'Setting...' : 'Set default folder'}
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onContinue(mode)}
            className="rounded-xl bg-[#1F4E79] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163b5c]"
          >
            Continue
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportOptionsModal;
