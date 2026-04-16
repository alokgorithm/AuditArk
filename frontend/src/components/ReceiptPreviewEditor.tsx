import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, FileText, Hash, ImageOff, ZoomIn, ZoomOut, RotateCcw, Loader2, Save } from 'lucide-react';
import type { ReceiptFile } from '../hooks/useFileUpload';
import type { ReceiptData } from './PushBatchButton';
import { useCreateVendor, useVendors } from '../hooks/useVendors';
import { useToast } from '../hooks/useToast';

const EMPTY_RECEIPT_DATA: ReceiptData = {
  vendor: '',
  date: '',
  invoice_no: '',
  amount: '',
  tax: '',
  total: '',
  hostel_no: '',
  account_no: '',
  ifsc: '',
  remarks: '',
};

const FIELD_GROUPS: Array<Array<keyof ReceiptData>> = [
  ['vendor', 'date'],
  ['invoice_no', 'hostel_no'],
  ['amount', 'tax'],
  ['total', 'account_no'],
  ['ifsc', 'remarks'],
];

const FIELD_LABELS: Record<keyof ReceiptData, string> = {
  vendor: 'Vendor',
  date: 'Date',
  invoice_no: 'Invoice No',
  amount: 'Amount',
  tax: 'Tax',
  total: 'Total',
  hostel_no: 'Hostel No',
  account_no: 'Account No',
  ifsc: 'IFSC',
  remarks: 'Remarks',
};

const FIELD_PLACEHOLDERS: Record<keyof ReceiptData, string> = {
  vendor: 'Enter vendor name',
  date: 'Select receipt date',
  invoice_no: 'Enter invoice number',
  amount: '0.00',
  tax: '0.00',
  total: '0.00',
  hostel_no: 'Enter hostel number',
  account_no: 'Enter account number',
  ifsc: 'Enter IFSC code',
  remarks: 'Add notes for review',
};

type ReceiptPreviewEditorProps = {
  files: ReceiptFile[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  receiptDataMap: Record<string, ReceiptData>;
  ocrScanningById?: Record<string, boolean>;
  onDraftChange: (fileId: string, data: ReceiptData) => void;
  onApproveReceipt?: (fileId: string) => void;
};

const isFormField = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
};

const getInitialReceiptData = (file?: ReceiptFile): ReceiptData => ({
  ...EMPTY_RECEIPT_DATA,
  vendor: file ? file.file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') : '',
});

const ReceiptPreviewEditor = ({ files, activeIndex, setActiveIndex, receiptDataMap, ocrScanningById, onDraftChange, onApproveReceipt }: ReceiptPreviewEditorProps) => {
  const activeFile = files[activeIndex];
  const { data: vendors = [] } = useVendors();
  const createVendor = useCreateVendor();
  const { addToast } = useToast();

  // Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });

  const totalFiles = files.length;

  // Derive current receipt data from the single source of truth.
  // Falls back to getInitialReceiptData for files not yet in the map.
  const receiptData: ReceiptData = useMemo(() => {
    if (!activeFile) return EMPTY_RECEIPT_DATA;
    return receiptDataMap[activeFile.id] ?? getInitialReceiptData(activeFile);
  }, [activeFile, receiptDataMap]);

  // Reset serialization ref and zoom when active file changes
  useEffect(() => {
    if (!activeFile) return;
    // Reset zoom/pan when switching files
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [activeFile?.id]);

  // Zoom helpers
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 5));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.25));
  const handleZoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(Math.max(z + (e.deltaY > 0 ? -0.1 : 0.1), 0.25), 5));
  };
  const handlePanStart = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOffsetRef.current = { ...pan };
  };
  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    setPan({
      x: panOffsetRef.current.x + (e.clientX - panStartRef.current.x),
      y: panOffsetRef.current.y + (e.clientY - panStartRef.current.y),
    });
  };
  const handlePanEnd = () => { isPanningRef.current = false; };

  // Clamp active index to valid range
  useEffect(() => {
    if (totalFiles === 0) return;
    if (activeIndex < 0) setActiveIndex(0);
    if (activeIndex >= totalFiles) setActiveIndex(totalFiles - 1);
  }, [activeIndex, setActiveIndex, totalFiles]);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!files.length || isFormField(event.target)) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveIndex(Math.max(0, activeIndex - 1));
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setActiveIndex(Math.min(files.length - 1, activeIndex + 1));
      }

      if (event.key === 'Home') {
        event.preventDefault();
        setActiveIndex(0);
      }

      if (event.key === 'End') {
        event.preventDefault();
        setActiveIndex(files.length - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, files.length, setActiveIndex]);

  const goToIndex = (index: number) => {
    if (!files.length) return;
    const nextIndex = Math.max(0, Math.min(files.length - 1, index));
    setActiveIndex(nextIndex);
  };

  // Direct update — no cascading effects
  const updateField = (field: keyof ReceiptData, value: string) => {
    if (!activeFile) return;
    const current = receiptDataMap[activeFile.id] ?? getInitialReceiptData(activeFile);
    onDraftChange(activeFile.id, {
      ...current,
      [field]: value,
    });
  };

  const matchingVendor = useMemo(() => {
    const normalized = receiptData.vendor.trim().toUpperCase();
    if (!normalized) return undefined;
    return vendors.find(v => v.normalized_name === normalized);
  }, [receiptData.vendor, vendors]);

  const suggestVendors = useMemo(() => {
    const needle = receiptData.vendor.trim().toLowerCase();
    if (!needle) return vendors.slice(0, 8);
    return vendors.filter(v => v.name.toLowerCase().includes(needle)).slice(0, 8);
  }, [receiptData.vendor, vendors]);

  const applyVendor = (vendorName: string) => {
    if (!activeFile) return;
    const normalized = vendorName.trim().toUpperCase();
    const vendor = vendors.find(v => v.normalized_name === normalized);
    const current = receiptDataMap[activeFile.id] ?? getInitialReceiptData(activeFile);

    if (!vendor) {
      onDraftChange(activeFile.id, { ...current, vendor: vendorName });
      return;
    }

    onDraftChange(activeFile.id, {
      ...current,
      vendor: vendor.name,
      account_no: vendor.account_no ?? '',
      ifsc: vendor.ifsc ?? '',
      remarks: vendor.remarks ?? '',
      amount: vendor.default_amount != null ? String(vendor.default_amount) : current.amount,
    });

    if (vendor) {
      addToast(`Auto-filled from ${vendor.name}`, 'success', 1800);
    }
  };

  const canCreateVendor = receiptData.vendor.trim().length > 0 && !matchingVendor;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white shadow-sm overflow-hidden border-l border-slate-200">

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="min-h-0 border-b border-slate-200 bg-slate-950 lg:border-b-0 lg:border-r lg:border-slate-200">
          {activeFile ? (
            <div
              className="relative flex h-full min-h-[320px] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800"
              onWheel={handleWheel}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
              style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
            >
              <img
                src={activeFile.preview}
                alt={activeFile.file.name}
                className="max-h-[calc(100vh-18rem)] w-full object-contain select-none shadow-2xl"
                draggable={false}
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transition: isPanningRef.current ? 'none' : 'transform 0.2s ease',
                }}
              />

              {/* OCR scanning overlay */}
              {ocrScanningById?.[activeFile.id] && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="animate-spin text-blue-400" />
                    <p className="text-sm font-medium text-white">Scanning with OCR…</p>
                  </div>
                </div>
              )}

              {/* File type badge */}
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm z-20">
                <FileText size={12} />
                <span>{activeFile.file.type || 'Image'}</span>
              </div>

              {/* Zoom controls — floating top-right */}
              <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-2 py-1.5 backdrop-blur-md z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                  className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="min-w-[3rem] text-center text-[11px] font-medium text-white/90 tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                  className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
                <div className="mx-0.5 h-5 w-px bg-white/20" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleZoomReset(); }}
                  className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  title="Reset Zoom"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* File info bar */}
              <div className="absolute bottom-4 left-4 right-4 grid gap-2 text-[11px] text-slate-200 sm:grid-cols-3 z-20">
                <div className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
                  <p className="text-slate-400">Filename</p>
                  <p className="truncate font-medium text-white">{activeFile.file.name}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
                  <p className="text-slate-400">Size</p>
                  <p className="font-medium text-white">{(activeFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
                  <p className="text-slate-400">Hash</p>
                  <p className="truncate font-mono text-white">{activeFile.hash}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center bg-slate-100 p-6 text-center text-slate-500">
              <div>
                <ImageOff size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Upload receipts to preview and edit them here.</p>
              </div>
            </div>
          )}
        </div>

        <div className="min-h-0 overflow-auto p-3 xl:p-3">
          {activeFile ? (
            <div className="flex h-full min-h-0 flex-col gap-2">
              <div className="grid items-start gap-2 lg:grid-cols-2">
                {FIELD_GROUPS.flat().map((field) => {
                  const isRemarks = field === 'remarks';
                  const isDate = field === 'date';
                  const isNumber = field === 'amount' || field === 'tax' || field === 'total' || field === 'hostel_no';

                  if (field === 'vendor') {
                    return (
                      <label
                        key={field}
                        className={`flex flex-col gap-1 rounded-xl border p-2.5 transition-colors ${
                          receiptData[field] ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/70'
                        }`}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {FIELD_LABELS[field]}
                        </span>
                        <input
                          type="text"
                          list="vendor-suggestions"
                          value={receiptData.vendor}
                          onChange={(event) => applyVendor(event.target.value)}
                          placeholder={FIELD_PLACEHOLDERS.vendor}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                        <datalist id="vendor-suggestions">
                          {suggestVendors.map(vendor => (
                            <option key={vendor.id} value={vendor.name} />
                          ))}
                        </datalist>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] text-slate-500">
                            {matchingVendor ? 'Vendor matched and fields auto-filled.' : 'Manual vendor entry enabled.'}
                          </p>
                          {canCreateVendor && (
                            <button
                              type="button"
                              onClick={() => {
                                const name = receiptData.vendor.trim();
                                createVendor.mutate(
                                  { name },
                                  {
                                    onSuccess: (vendor) => {
                                      applyVendor(vendor.name);
                                      addToast('Vendor created', 'success');
                                    },
                                    onError: () => {
                                      addToast('Failed to create vendor', 'error');
                                    },
                                  },
                                );
                              }}
                              disabled={createVendor.isPending}
                              className="rounded-md border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                            >
                              {createVendor.isPending ? 'Creating...' : 'Create Vendor'}
                            </button>
                          )}
                        </div>
                      </label>
                    );
                  }

                  return (
                    <label
                      key={field}
                      className={`flex flex-col gap-1 rounded-xl border p-2.5 transition-colors ${
                        receiptData[field] ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {FIELD_LABELS[field]}
                      </span>
                      {isRemarks ? (
                        <textarea
                          value={receiptData[field]}
                          onChange={(event) => updateField(field, event.target.value)}
                          placeholder={FIELD_PLACEHOLDERS[field]}
                          rows={2}
                          className="h-20 w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                      ) : (
                        <input
                          type={isDate ? 'date' : 'text'}
                          inputMode={isNumber ? 'decimal' : 'text'}
                          value={receiptData[field]}
                          onChange={(event) => updateField(field, event.target.value)}
                          placeholder={FIELD_PLACEHOLDERS[field]}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                      )}
                    </label>
                  );
                })}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-200 pt-2 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    onDraftChange(activeFile.id, receiptData);
                    onApproveReceipt?.(activeFile.id);
                    addToast('Saved and approved', 'success');
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <Save size={16} /> Save
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    onDraftChange(activeFile.id, receiptData);
                    onApproveReceipt?.(activeFile.id);
                    
                    if (activeIndex < files.length - 1) {
                      goToIndex(activeIndex + 1);
                      addToast('Saved, approved, moved to next.', 'success', 1500);
                    } else {
                      addToast('Saved and approved. You reached the end.', 'success', 1500);
                    }
                  }}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  Save &amp; Next <ChevronRight size={16} className="-mr-1" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-slate-500">
              <div>
                <Hash size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">No active receipt to edit.</p>
                <p className="text-xs text-slate-400">Add files to begin inline review.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptPreviewEditor;