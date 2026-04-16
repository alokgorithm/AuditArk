import { useMemo, useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { exists, writeFile } from '@tauri-apps/plugin-fs';
import { apiClient } from '../api/client';
import type { ReceiptFile } from '../hooks/useFileUpload';
import { useExportSettings } from '../hooks/useExportSettings';
import type { ReceiptData } from './PushBatchButton';
import { useModal } from './modal/useModal';
import { useToast } from '../hooks/useToast';

type ExportButtonProps = {
  batchId: number;
  files: ReceiptFile[];
  receiptDataMap: Record<string, ReceiptData>;
};

const getFolderPath = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  if (idx < 0) return filePath;
  return normalized.slice(0, idx);
};

const buildDataFromFiles = (targetFiles: ReceiptFile[], receiptDataMap: Record<string, ReceiptData>) => {
  return targetFiles
    .map(file => receiptDataMap[file.id])
    .filter((data): data is ReceiptData => Boolean(data));
};

export async function exportData(batchId: number, data: ReceiptData[]) {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const response = await apiClient.get('/api/export/excel', {
    params: { batch_id: batchId },
    responseType: 'arraybuffer',
    timeout: 30000,
  });

  return new Uint8Array(response.data);
}

export async function exportPdfData(path: string, data: ReceiptData[]) {
  const response = await fetch('http://127.0.0.1:8741/api/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, data }),
  });

  return response.json();
}

const ExportButton = ({ batchId, files, receiptDataMap }: ExportButtonProps) => {
  const { settings, setAskEveryTime, setDefaultPath } = useExportSettings();
  const { openConfirm, openExportOptions } = useModal();
  const { addToast } = useToast();

  const [isExporting, setIsExporting] = useState(false);

  const approvedFiles = useMemo(
    () => files.filter(file => file.status === 'approved'),
    [files]
  );

  const showError = (message: string) => addToast(message, 'error');

  const resolvePath = async () => {
    if (settings.askEveryTime) {
      const selected = await save({
        title: 'Save Excel Export',
        defaultPath: settings.defaultPath ? `${settings.defaultPath}/report.xlsx` : 'report.xlsx',
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });
      return selected;
    }

    if (settings.defaultPath) {
      return `${settings.defaultPath}/report.xlsx`;
    }

    const selected = await save({
      title: 'Set Export File',
      defaultPath: 'report.xlsx',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });
    if (!selected) return null;
    setDefaultPath(getFolderPath(selected));
    return selected;
  };

  const executeExport = async (targetPath: string, data: ReceiptData[]) => {
    setIsExporting(true);
    try {
      const bytes = await exportData(batchId, data);
      await writeFile(targetPath, bytes);
      addToast('File saved successfully', 'success');
    } catch {
      showError('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleContinue = async (mode: 'all' | 'approved') => {
    const sourceFiles = mode === 'approved' ? approvedFiles : files;
    const data = buildDataFromFiles(sourceFiles, receiptDataMap);

    if (data.length === 0) {
      showError(mode === 'approved' ? 'No approved receipts to export' : 'Export failed');
      return;
    }

    const filePath = await resolvePath();
    if (!filePath) return;

    const fileExists = await exists(filePath);
    if (fileExists) {
      addToast('File exists. Confirm overwrite to continue.', 'warning');
      openConfirm({
        title: 'File already exists. Overwrite?',
        message: 'An existing file will be replaced.',
        confirmText: 'Yes',
        cancelText: 'No',
        onConfirm: () => {
          void executeExport(filePath, data);
        },
      });
      return;
    }

    await executeExport(filePath, data);
  };

  const handleSetDefaultFolder = async () => {
    const selected = await save({
      title: 'Choose Default Export Folder',
      defaultPath: settings.defaultPath ? `${settings.defaultPath}/report.xlsx` : 'report.xlsx',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });
    if (!selected) return settings.defaultPath;
    const folder = getFolderPath(selected);
    setDefaultPath(folder);
    addToast('Default export folder updated', 'info');
    return folder;
  };

  const handleExportClick = () => {
    if (isExporting || files.length === 0) return;

    openExportOptions({
      askEveryTime: settings.askEveryTime,
      defaultPath: settings.defaultPath,
      onAskEveryTimeChange: setAskEveryTime,
      onSetDefaultFolder: handleSetDefaultFolder,
      onContinue: (mode) => {
        void handleContinue(mode);
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleExportClick}
      disabled={isExporting || files.length === 0}
      className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isExporting ? 'Exporting...' : 'Export'}
    </button>
  );
};

export default ExportButton;
