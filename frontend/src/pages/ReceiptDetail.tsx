import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useReceipt, useReceiptEdits, useUpdateReceipt, useUpdateStatus,
  useReceipts, useDeleteReceipt, useDeleteReceiptImage,
} from '../hooks/useReceipts';
import { ImageStrip } from '../components/ImageStrip';
import {
  ChevronLeft, ChevronRight, Save, ZoomIn, ZoomOut, RotateCcw,
  Clock, Trash2, ImageOff, AlertTriangle,
} from 'lucide-react';

import { API_BASE } from '../api/client';
import { useModal } from '../components/modal/useModal';

// ───── Inline Editable Field (click-to-edit, no icon) ─────

interface FieldDef {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
}

function InlineField({
  field, value, onChange, isMissing,
}: {
  field: FieldDef;
  value: string;
  onChange: (val: string) => void;
  isMissing: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded ${isMissing ? 'bg-amber-50 border border-amber-200' : 'hover:bg-slate-50'}`}>
      <label className="w-24 shrink-0 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
        {isMissing && <AlertTriangle size={10} className="text-amber-500" />}
        {field.label}
      </label>
      <input
        ref={inputRef}
        type={field.type || 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={`Enter ${field.label.toLowerCase()}`}
        className={`flex-1 text-sm font-medium bg-transparent border-b border-transparent focus:border-primary outline-none py-0.5 px-1 transition-colors ${
          value ? 'text-slate-800' : 'text-slate-400 italic'
        }`}
      />
    </div>
  );
}

// ───── Zoom/Pan Image Viewer ─────

function ImageViewer({ src }: { src: string | null }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    // Trackpad pinch sends ctrlKey + small deltaY; mouse wheel sends larger deltaY
    const isPinch = e.ctrlKey;
    const delta = isPinch ? -e.deltaY * 0.01 : (e.deltaY > 0 ? -0.08 : 0.08);
    setZoom(z => Math.max(0.5, Math.min(5, z + delta)));
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan(p => ({
      x: p.x + (e.clientX - lastPos.current.x),
      y: p.y + (e.clientY - lastPos.current.y),
    }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseUp = () => setDragging(false);

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
        <div className="text-center">
          <ImageOff size={40} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No image</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-20 flex gap-1">
        <button onClick={() => setZoom(z => Math.min(5, z + 0.3))} className="bg-white/90 border border-slate-200 p-1.5 rounded shadow-sm hover:bg-slate-50" title="Zoom in">
          <ZoomIn size={14} />
        </button>
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.3))} className="bg-white/90 border border-slate-200 p-1.5 rounded shadow-sm hover:bg-slate-50" title="Zoom out">
          <ZoomOut size={14} />
        </button>
        <button onClick={resetView} className="bg-white/90 border border-slate-200 p-1.5 rounded shadow-sm hover:bg-slate-50" title="Reset">
          <RotateCcw size={14} />
        </button>
        <span className="bg-white/90 border border-slate-200 px-2 py-1.5 rounded shadow-sm text-[10px] font-bold text-slate-500">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Image viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-slate-100"
        style={{ cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            transition: dragging ? 'none' : 'transform 0.1s',
          }}
        >
          <img
            src={`${API_BASE}/data/${src}`}
            alt="Receipt"
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </div>
    </div>
  );
}

// ───── Main ReceiptDetail Page ─────

const FIELDS: FieldDef[] = [
  { key: 'vendor', label: 'Vendor', required: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'invoice_no', label: 'Invoice No' },
  { key: 'hostel_no', label: 'Hostel', type: 'number' },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'tax', label: 'Tax', type: 'number' },
  { key: 'total', label: 'Total', type: 'number', required: true },
  { key: 'category', label: 'Category' },
  { key: 'account_no', label: 'Account No' },
  { key: 'ifsc', label: 'IFSC' },
  { key: 'remarks', label: 'Remarks' },
];

export default function ReceiptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const receiptId = id ? parseInt(id) : undefined;

  const { data: receipt, isLoading } = useReceipt(receiptId);
  const { data: edits } = useReceiptEdits(receiptId);
  const updateReceipt = useUpdateReceipt();
  const updateStatus = useUpdateStatus();
  const deleteReceipt = useDeleteReceipt();
  const deleteImage = useDeleteReceiptImage();
  const { openConfirm } = useModal();

  // Fetch batch receipts for image strip + navigation
  const batchId = receipt?.batch_id;
  const { data: batchData } = useReceipts(batchId ? { batch_id: batchId } : {});
  const batchReceipts = batchData?.receipts || [];

  // Local form state
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showAudit, setShowAudit] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync form from receipt data
  useEffect(() => {
    if (!receipt) return;
    const vals: Record<string, string> = {};
    FIELDS.forEach(f => {
      const v = (receipt as unknown as Record<string, unknown>)[f.key];
      vals[f.key] = v != null ? String(v) : '';
    });
    setFormValues(vals);
    setDirty(false);
  }, [receipt]);

  // Navigation
  const currentIdx = batchReceipts.findIndex(r => r.id === receiptId);
  const prevId = currentIdx > 0 ? batchReceipts[currentIdx - 1].id : null;
  const nextId = currentIdx < batchReceipts.length - 1 ? batchReceipts[currentIdx + 1].id : null;

  const goTo = (rid: number) => navigate(`/receipts/${rid}`, { replace: true });

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft' && prevId) goTo(prevId);
      if (e.key === 'ArrowRight' && nextId) goTo(nextId);
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const handleFieldChange = (key: string, val: string) => {
    setFormValues(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const buildUpdates = () => {
    if (!receipt) return {};
    const updates: Record<string, unknown> = {};
    FIELDS.forEach(f => {
      const newVal = formValues[f.key] ?? '';
      const oldVal = (receipt as unknown as Record<string, unknown>)[f.key];
      const oldStr = oldVal != null ? String(oldVal) : '';
      if (newVal !== oldStr) {
        if (f.type === 'number') {
          updates[f.key] = newVal ? parseFloat(newVal) : null;
        } else {
          updates[f.key] = newVal || null;
        }
      }
    });
    return updates;
  };

  const handleSave = () => {
    if (!receiptId) return;
    const updates = buildUpdates();
    if (Object.keys(updates).length === 0 && receipt?.status === 'reviewed') return;

    const doStatusUpdate = () => {
      if (receipt?.status !== 'reviewed' && receipt?.status !== 'locked') {
        updateStatus.mutate({ id: receiptId, status: 'reviewed' });
      }
    };

    if (Object.keys(updates).length > 0) {
      updateReceipt.mutate(
        { id: receiptId, updates: updates as Partial<import('../types').Receipt> },
        { onSuccess: doStatusUpdate },
      );
    } else {
      doStatusUpdate();
    }
    setDirty(false);
  };

  const handleSaveAndNext = () => {
    handleSave();
    if (nextId) setTimeout(() => goTo(nextId), 150);
  };

  const handleDelete = () => {
    if (!receiptId) return;
    openConfirm({
      title: 'Delete receipt',
      message: 'Delete this receipt and all its data? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => {
        deleteReceipt.mutate(receiptId, {
          onSuccess: () => {
            if (nextId) goTo(nextId);
            else if (prevId) goTo(prevId);
            else navigate('/receipts');
          },
        });
      },
    });
  };

  const handleDeleteImage = () => {
    if (!receiptId) return;
    openConfirm({
      title: 'Remove image',
      message: 'Remove image from this receipt? Data will be kept.',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      onConfirm: () => deleteImage.mutate(receiptId),
    });
  };

  if (isLoading) return (
    <div className="flex-1 flex justify-center items-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
  );
  if (!receipt) return <div className="p-8 text-center text-red-500">Receipt not found</div>;

  const missingFields = FIELDS.filter(f => f.required && !formValues[f.key]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Image strip */}
      <ImageStrip
        receipts={batchReceipts}
        activeId={receiptId}
        onSelect={goTo}
      />

      {/* Top nav bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => prevId && goTo(prevId)} disabled={!prevId}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={16} /> Prev
          </button>
          <button onClick={() => nextId && goTo(nextId)} disabled={!nextId}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
            Next <ChevronRight size={16} />
          </button>
          <span className="text-sm text-slate-500 ml-2">
            Receipt <strong>#{receipt.id}</strong>
            {batchReceipts.length > 0 && <> ({currentIdx + 1}/{batchReceipts.length})</>}
          </span>
          {receipt.status && (
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ml-2 ${
              receipt.status === 'reviewed' ? 'bg-emerald-100 text-emerald-700' :
              receipt.status === 'locked' ? 'bg-purple-100 text-purple-700' :
              receipt.status === 'extracted' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {receipt.status}
            </span>
          )}
          {missingFields.length > 0 && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full ml-1">
              {missingFields.length} missing
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDeleteImage} className="p-1.5 text-slate-400 hover:text-red-500 rounded" title="Remove image">
            <ImageOff size={16} />
          </button>
          <button onClick={handleDelete} className="p-1.5 text-slate-400 hover:text-red-500 rounded" title="Delete receipt">
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => setShowAudit(!showAudit)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showAudit ? 'bg-primary text-white border-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock size={12} />
            Audit ({edits?.length || 0})
          </button>
        </div>
      </div>

      {/* Main content: image + form */}
      <div className="flex-1 flex overflow-hidden">
        {/* Image viewer (60%) */}
        <div className="w-3/5 border-r border-slate-200">
          <ImageViewer src={receipt.image_path} />
        </div>

        {/* Fields panel (40%) */}
        <div className="w-2/5 flex flex-col overflow-hidden bg-white">
          {/* Fields */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {FIELDS.map(f => (
              <InlineField
                key={f.key}
                field={f}
                value={formValues[f.key] ?? ''}
                onChange={val => handleFieldChange(f.key, val)}
                isMissing={!!f.required && !formValues[f.key]}
              />
            ))}
          </div>

          {/* Audit log (collapsible) */}
          {showAudit && edits && edits.length > 0 && (
            <div className="border-t border-slate-200 max-h-40 overflow-y-auto px-4 py-2 bg-slate-50 text-xs">
              {edits.map((e, i) => (
                <div key={i} className="flex items-center gap-2 py-1 border-b border-slate-100 last:border-0">
                  <span className="font-semibold text-primary w-20 shrink-0">{e.field_name}</span>
                  <span className="text-red-500 line-through">{e.old_value || '(empty)'}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-emerald-600 font-medium">{e.new_value || '(empty)'}</span>
                  <span className="text-slate-400 ml-auto shrink-0">{new Date(e.edited_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bottom action bar */}
          <div className="border-t border-slate-200 px-4 py-2.5 flex items-center justify-between bg-white shrink-0">
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={updateReceipt.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-[#153a5c] disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={handleSaveAndNext}
                disabled={updateReceipt.isPending || !nextId}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                Save & Next
                <ChevronRight size={14} />
              </button>
            </div>
            {dirty && <span className="text-[10px] font-medium text-amber-600">Unsaved changes</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
