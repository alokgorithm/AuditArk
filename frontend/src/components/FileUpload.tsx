import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, Image as ImageIcon, Save, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFileUpload, type ReceiptFile } from '../hooks/useFileUpload';
import ThumbnailStrip from './ThumbnailStrip';
import ReceiptPreviewEditor from './ReceiptPreviewEditor';
import PushBatchButton, { type ReceiptData } from './PushBatchButton';
import ExportButton from './ExportButton';
import DeleteButton from './DeleteButton';
import StatusBadge from './StatusBadge';
import { useSelection } from '../hooks/useSelection';
import { useModal } from './modal/useModal';
import { useToast } from '../hooks/useToast';
import { apiClient, API_BASE } from '../api/client';

const makeDraftData = (fileName: string): ReceiptData => ({
  vendor: fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
  date: '',
  invoice_no: '',
  amount: '',
  tax: '',
  total: '',
  hostel_no: '',
  account_no: '',
  ifsc: '',
  remarks: '',
});

const OCR_CONCURRENCY = 3;

type FileUploadProps = {
  batchId: number;
};

const FileUpload = ({ batchId }: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const {
    files,
    activeIndex,
    setActiveIndex,
    addFiles,
    setFiles,
    feedback,
    setFeedback,
    markFilesApproved,
    removeFiles,
    removeImage,
  } = useFileUpload();
  const [receiptDataMap, setReceiptDataMap] = useState<Record<string, ReceiptData>>({});
  const filesRef = useRef<ReceiptFile[]>([]);
  const activeOcrCountRef = useRef(0);
  const processingOcrIdsRef = useRef<Set<string>>(new Set());
  const [ocrScanningMap, setOcrScanningMap] = useState<Record<string, boolean>>({});
  const { openConfirm } = useModal();
  const { addToast } = useToast();
  const { selectedIds, toggleSelect, clearSelection } = useSelection(files.map(file => file.id));

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const handleDraftChange = useCallback((fileId: string, data: ReceiptData) => {
    setReceiptDataMap(prev => {
      if (prev[fileId] === data) return prev;
      return { ...prev, [fileId]: data };
    });
  }, []);

  const startBackgroundOcr = useCallback(async (file: ReceiptFile) => {
    if (processingOcrIdsRef.current.has(file.id)) return;

    processingOcrIdsRef.current.add(file.id);
    activeOcrCountRef.current += 1;

    setOcrScanningMap(prev => ({ ...prev, [file.id]: true }));
    setFiles(prev => prev.map(item => (
      item.id === file.id && item.status === 'pending'
        ? { ...item, status: 'processing' }
        : item
    )));

    try {
      const formData = new FormData();
      formData.append('file', file.file);

      const response = await apiClient.post('/api/ocr/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      const extracted = response.data;
      const defaultDraft = makeDraftData(file.file.name);

      setReceiptDataMap(prev => {
        const current = prev[file.id] ?? defaultDraft;
        const next: ReceiptData = {
          vendor: current.vendor && current.vendor !== defaultDraft.vendor ? current.vendor : (extracted.vendor || current.vendor),
          date: current.date || extracted.date || '',
          invoice_no: current.invoice_no || extracted.invoice_no || '',
          amount: current.amount || extracted.amount || '0.00',
          tax: current.tax || extracted.tax || '0.00',
          total: current.total || extracted.total || '0.00',
          hostel_no: current.hostel_no || extracted.hostel_no || '',
          account_no: current.account_no || extracted.account_no || '',
          ifsc: current.ifsc || extracted.ifsc || '',
          remarks: current.remarks || extracted.remarks || '',
        };

        return { ...prev, [file.id]: next };
      });

      setFiles(prev => prev.map(item => (
        item.id === file.id && item.status !== 'approved'
          ? { ...item, status: 'extracted' }
          : item
      )));
    } catch {
      setFiles(prev => prev.map(item => (
        item.id === file.id && item.status !== 'approved'
          ? { ...item, status: 'error' }
          : item
      )));
    } finally {
      setOcrScanningMap(prev => ({ ...prev, [file.id]: false }));
      processingOcrIdsRef.current.delete(file.id);
      activeOcrCountRef.current = Math.max(0, activeOcrCountRef.current - 1);
    }
  }, [setFiles]);

  useEffect(() => {
    if (files.length === 0) return;

    const available = Math.max(0, OCR_CONCURRENCY - activeOcrCountRef.current);
    if (available === 0) return;

    const pending = files.filter(file => (
      file.status === 'pending'
      && file.file.size > 0
      && !processingOcrIdsRef.current.has(file.id)
    ));

    if (pending.length === 0) return;

    pending.slice(0, available).forEach(file => {
      void startBackgroundOcr(file);
    });
  }, [files, startBackgroundOcr]);

  // Draft persistence refs
  const draftSaveTimerRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const loadedRef = useRef(false);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load saved drafts on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    apiClient.get(`/api/staging/${batchId}/drafts`).then(async (res) => {
      const drafts = res.data?.drafts;
      if (!drafts || drafts.length === 0) return;

      const restoredFiles: ReceiptFile[] = [];
      const restoredData: Record<string, ReceiptData> = {};
      const seenHashes = new Set<string>();

      for (const draft of drafts) {
        const id = `draft_${draft.id}`;
        let file: File;
        let preview = '';

        if (draft.image_url) {
          try {
            const imgResp = await fetch(`${API_BASE}${draft.image_url}`);
            const blob = await imgResp.blob();
            const filename = draft.image_path?.split('/').pop() || `receipt_${draft.id}.jpg`;
            file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
            preview = URL.createObjectURL(file);
          } catch {
            file = new File([], `receipt_${draft.id}.jpg`, { type: 'image/jpeg' });
          }
        } else {
          file = new File([], `receipt_${draft.id}.jpg`, { type: 'image/jpeg' });
        }

        // Keep hash format consistent with addFiles() dedupe logic.
        const hash = `${file.name}_${file.size}`;
        if (seenHashes.has(hash)) {
          continue;
        }
        seenHashes.add(hash);

        restoredFiles.push({
          id,
          file,
          preview,
          status: 'extracted',
          isDuplicate: false,
          isValid: true,
          hash,
        });

        restoredData[id] = {
          vendor: draft.vendor || '',
          date: draft.date || '',
          invoice_no: draft.invoice_no || '',
          amount: draft.amount || '0.00',
          tax: draft.tax || '0.00',
          total: draft.total || '0.00',
          hostel_no: draft.hostel_no || '',
          account_no: draft.account_no || '',
          ifsc: draft.ifsc || '',
          remarks: draft.remarks || '',
        };
      }

      if (restoredFiles.length > 0) {
        setFiles(restoredFiles);
        setReceiptDataMap(restoredData);
        addToast(`Restored ${restoredFiles.length} draft receipt(s)`, 'info', 2500);
      }
    }).catch(() => {});
  }, [batchId]);

  // Auto-save drafts
  const saveDrafts = useCallback(() => {
    if (isSavingRef.current || files.length === 0) return;
    isSavingRef.current = true;
    setDraftStatus('saving');

    const metadata = files.map(f => ({
      client_id: f.id,
      vendor: receiptDataMap[f.id]?.vendor || '',
      date: receiptDataMap[f.id]?.date || '',
      invoice_no: receiptDataMap[f.id]?.invoice_no || '',
      amount: receiptDataMap[f.id]?.amount || '0.00',
      tax: receiptDataMap[f.id]?.tax || '0.00',
      total: receiptDataMap[f.id]?.total || '0.00',
      hostel_no: receiptDataMap[f.id]?.hostel_no || '',
      account_no: receiptDataMap[f.id]?.account_no || '',
      ifsc: receiptDataMap[f.id]?.ifsc || '',
      remarks: receiptDataMap[f.id]?.remarks || '',
      filename: f.file.name,
    }));

    const formData = new FormData();
    formData.append('metadata', JSON.stringify(metadata));

    for (const f of files) {
      if (f.file.size > 0) {
        formData.append('files', f.file, f.file.name);
      }
    }

    apiClient.post(`/api/staging/${batchId}/save`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }).then(() => {
      setDraftStatus('saved');
      setTimeout(() => setDraftStatus('idle'), 2000);
    }).catch(() => {
      setDraftStatus('idle');
    }).finally(() => {
      isSavingRef.current = false;
    });
  }, [batchId, files, receiptDataMap]);

  useEffect(() => {
    if (files.length === 0) return;
    if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = window.setTimeout(saveDrafts, 3000);
    return () => {
      if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current);
    };
  }, [files, receiptDataMap, saveDrafts]);

  useEffect(() => {
    return () => {
      if (files.length > 0) saveDrafts();
    };
  }, [files, saveDrafts]);

  useEffect(() => {
    if (feedback.length === 0) return;
    feedback.forEach((msg) => {
      const isWarning = msg.includes('skipped') || msg.includes('No valid');
      addToast(msg, isWarning ? 'warning' : 'success');
    });
    const timer = setTimeout(() => setFeedback([]), 4000);
    return () => clearTimeout(timer);
  }, [addToast, feedback, setFeedback]);

  useEffect(() => {
    if (files.length === 0) return;
    setReceiptDataMap(prev => {
      let changed = false;
      const next = { ...prev };
      for (const file of files) {
        if (!next[file.id]) {
          next[file.id] = makeDraftData(file.file.name);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [files]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    addFiles(fileList);
  }, [addFiles]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  useEffect(() => {
    if (selectedIds.length === 0) return;
    const idSet = new Set(files.map(file => file.id));
    const hasInvalid = selectedIds.some(id => !idSet.has(id));
    if (hasInvalid) clearSelection();
  }, [files, selectedIds, clearSelection]);

  const handlePushSuccess = useCallback(() => {
    apiClient.delete(`/api/staging/${batchId}/drafts`).catch(() => {});
  }, [batchId]);

  const handleApproveReceipt = useCallback((fileId: string) => {
    markFilesApproved([fileId]);
  }, [markFilesApproved]);

  const goToIndex = useCallback((index: number) => {
    if (!files.length) return;
    const nextIndex = Math.max(0, Math.min(files.length - 1, index));
    setActiveIndex(nextIndex);
  }, [files.length, setActiveIndex]);

  const activeFile = files[activeIndex];

  return (
    <div 
      className="flex h-full w-full overflow-hidden bg-slate-100"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/jpg,image/webp,image/bmp"
        className="hidden"
        onChange={onInputChange}
      />

      {files.length === 0 ? (
        // Empty state — entire screen is a dropzone
        <div className="m-auto flex flex-col items-center justify-center p-10 max-w-lg w-full">
          <div
            onClick={() => inputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center gap-4 w-full rounded-3xl border-4 border-dashed
              cursor-pointer transition-all duration-200 select-none aspect-[4/3]
              ${isDragging
                ? 'border-blue-500 bg-blue-50 scale-105'
                : 'border-slate-300 hover:border-blue-400 hover:bg-white bg-white/50'
              }
            `}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
              {isDragging
                ? <ImageIcon size={40} className="text-blue-500" />
                : <Upload size={40} className="text-slate-400" />
              }
            </div>
            <div className="text-center px-6">
              <h3 className={`text-xl font-bold mb-2 transition-colors ${isDragging ? 'text-blue-600' : 'text-slate-700'}`}>
                {isDragging ? 'Drop receipts here!' : 'Click to upload or drag & drop'}
              </h3>
              <p className="text-sm text-slate-500">
                Support for JPEG, PNG, WebP, and BMP files.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Sub-layout: Vertical Strip -> Preview Editor
        <>
          <ThumbnailStrip
            files={files}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            selectedIds={selectedIds}
            toggleSelect={toggleSelect}
            onDeleteImage={(id) => {
              openConfirm({
                title: 'Delete this image?',
                message: 'Image will be removed, receipt data will be kept.',
                confirmText: 'Delete Image',
                cancelText: 'Cancel',
                onConfirm: () => {
                  removeImage(id);
                  addToast('Image deleted', 'success');
                },
              });
            }}
          />
          <div className="flex-1 flex flex-col min-w-0 h-full relative">
            {/* Top Toolbar overlayed over editor or just right above it */}
            <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 bg-white border-b border-slate-200 shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 p-0.5">
                <button
                  type="button"
                  onClick={() => goToIndex(activeIndex - 1)}
                  disabled={!files.length || activeIndex <= 0}
                  className="flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white disabled:opacity-40"
                >
                  <ChevronLeft size={14} className="mr-0.5" /> Prev
                </button>
                <div className="w-px h-4 bg-slate-200" />
                <button
                  type="button"
                  onClick={() => goToIndex(activeIndex + 1)}
                  disabled={!files.length || activeIndex >= files.length - 1}
                  className="flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white disabled:opacity-40"
                >
                  Next <ChevronRight size={14} className="ml-0.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 min-w-0 text-sm text-slate-700 font-medium">
                <span className="truncate">Receipt #{activeIndex + 1} ({activeIndex + 1}/{files.length})</span>
                {activeFile && <StatusBadge status={activeFile.status} />}
              </div>

              {/* Action Buttons */}
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                {draftStatus === 'saving' && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium animate-pulse bg-amber-50 px-2 py-1 rounded-md">
                    <Save size={14} /> Saving…
                  </span>
                )}
                {draftStatus === 'saved' && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-md">
                    <Save size={14} /> Saved
                  </span>
                )}
                <div className="hidden h-6 w-px bg-slate-200 mx-1 lg:block"></div>
                <DeleteButton
                  selectedIds={selectedIds}
                  onDeleteSuccess={(ids) => {
                    removeFiles(ids);
                    setReceiptDataMap(prev => {
                      const next = { ...prev };
                      ids.forEach(id => delete next[id]);
                      return next;
                    });
                  }}
                  onClearSelection={clearSelection}
                />
                <button
                  onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors border border-slate-200"
                >
                  <Plus size={16} /> Add More
                </button>
                <ExportButton
                  batchId={batchId}
                  files={files}
                  receiptDataMap={receiptDataMap}
                />
                <PushBatchButton
                  batchId={batchId}
                  files={files}
                  receiptDataMap={receiptDataMap}
                  setActiveIndex={setActiveIndex}
                  markFilesApproved={markFilesApproved}
                  onPushSuccess={handlePushSuccess}
                />
              </div>
            </div>
            
            {/* Main Editor */}
            <div className="flex-1 flex min-h-0">
              <ReceiptPreviewEditor
                files={files}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                receiptDataMap={receiptDataMap}
                ocrScanningById={ocrScanningMap}
                onDraftChange={handleDraftChange}
                onApproveReceipt={handleApproveReceipt}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FileUpload;
