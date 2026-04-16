import { useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import type { ReceiptFile } from '../hooks/useFileUpload';
import { useModal } from './modal/useModal';
import { useToast } from '../hooks/useToast';

export type ReceiptData = {
  vendor: string;
  date: string;
  invoice_no: string;
  amount: string;
  tax: string;
  total: string;
  hostel_no: string;
  account_no: string;
  ifsc: string;
  remarks: string;
};

type PushBatchButtonProps = {
  batchId: number;
  files: ReceiptFile[];
  receiptDataMap: Record<string, ReceiptData>;
  setActiveIndex: (index: number) => void;
  markFilesApproved: (ids: string[]) => void;
  onPushSuccess?: () => void;
};

const toPayload = (data: ReceiptData) => ({
  vendor: data.vendor,
  date: data.date,
  invoice_no: data.invoice_no,
  amount: data.amount,
  tax: data.tax,
  total: data.total,
  hostel_no: data.hostel_no,
  account_no: data.account_no,
  ifsc: data.ifsc,
  remarks: data.remarks,
});

export async function pushToDatabase(
  batchId: number,
  targetFiles: ReceiptFile[],
  receiptDataMap: Record<string, ReceiptData>,
) {
  const formData = new FormData();

  // Build receipt payloads including the filename for image matching
  const receiptsPayload = targetFiles.map(f => ({
    ...toPayload(receiptDataMap[f.id] || {}),
    filename: f.file.name,
  }));
  formData.append('receipts_json', JSON.stringify(receiptsPayload));

  // Attach actual image files
  targetFiles.forEach(f => {
    if (f.file) formData.append('files', f.file);
  });

  const { data } = await apiClient.post(
    `/api/batches/${batchId}/push`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    },
  );
  return data as { batch_id: number; inserted: number; duplicates: unknown[] };
}

const PushBatchButton = ({
  batchId,
  files,
  receiptDataMap,
  setActiveIndex,
  markFilesApproved,
  onPushSuccess,
}: PushBatchButtonProps) => {
  const { openConfirm } = useModal();
  const { addToast } = useToast();
  const [isPushing, setIsPushing] = useState(false);

  const total = files.length;
  const approvedFiles = useMemo(() => files.filter(file => file.status === 'approved'), [files]);
  const approved = approvedFiles.length;

  const runPush = async (targetFiles: ReceiptFile[]) => {
    if (targetFiles.length === 0) {
      addToast('No receipts to push', 'error');
      return;
    }

    setIsPushing(true);
    try {
      const result = await pushToDatabase(batchId, targetFiles, receiptDataMap);
      markFilesApproved(targetFiles.map(file => file.id));
      addToast(`${result.inserted} receipts pushed to database`, 'success');
      if (result.duplicates.length > 0) {
        addToast(`${result.duplicates.length} duplicates skipped`, 'warning');
      }
      onPushSuccess?.();
    } catch {
      addToast('Failed to push data', 'error');
    } finally {
      setIsPushing(false);
    }
  };

  const handlePushClick = () => {
    if (total === 0 || isPushing) return;

    if (approved === 0) {
      addToast('No approved receipts to push', 'warning');
      return;
    }

    if (approved === total) {
      void runPush(approvedFiles);
      return;
    }

    const firstUnapprovedIndex = files.findIndex(file => file.status !== 'approved');

    openConfirm({
      title: 'Some receipts are not verified',
      message: 'You have unverified receipts. Choose an action.',
      confirmText: 'Push Only Verified',
      secondaryText: 'Review Unverified',
      cancelText: 'Cancel',
      onConfirm: () => {
        addToast('Pushing only verified receipts', 'warning');
        void runPush(approvedFiles);
      },
      onSecondary: () => {
        if (firstUnapprovedIndex >= 0) setActiveIndex(firstUnapprovedIndex);
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handlePushClick}
      disabled={total === 0 || isPushing}
      className="inline-flex items-center rounded-xl bg-[#1F4E79] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#163b5c] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPushing ? 'Pushing...' : `Push Batch (${approved}/${total} approved)`}
    </button>
  );
};

export default PushBatchButton;