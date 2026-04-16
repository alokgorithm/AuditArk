import { useRef, useEffect } from 'react';
import { Loader2, Check, Lock, AlertCircle, Clock } from 'lucide-react';
import type { Receipt } from '../types';
import { API_BASE } from '../api/client';

const STATUS_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  pending:    { bg: 'bg-slate-200', border: 'border-slate-300', icon: <Clock size={12} className="text-slate-500" /> },
  processing: { bg: 'bg-blue-100', border: 'border-blue-400', icon: <Loader2 size={12} className="text-blue-500 animate-spin" /> },
  extracted:  { bg: 'bg-amber-100', border: 'border-amber-400', icon: <AlertCircle size={12} className="text-amber-600" /> },
  reviewed:   { bg: 'bg-emerald-100', border: 'border-emerald-500', icon: <Check size={12} className="text-emerald-600" /> },
  locked:     { bg: 'bg-purple-100', border: 'border-purple-400', icon: <Lock size={12} className="text-purple-500" /> },
};

interface ImageStripProps {
  receipts: Receipt[];
  activeId: number | undefined;
  onSelect: (id: number) => void;
}

export function ImageStrip({ receipts, activeId, onSelect }: ImageStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeId]);

  if (receipts.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 px-4 py-2 overflow-x-auto shrink-0 bg-slate-100 border-b border-slate-200"
      style={{ scrollbarWidth: 'thin' }}
    >
      {receipts.map((r) => {
        const isActive = r.id === activeId;
        const st = STATUS_STYLES[r.status] || STATUS_STYLES.extracted;
        return (
          <button
            key={r.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelect(r.id)}
            className={`relative shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${
              isActive ? 'border-primary ring-2 ring-primary/30 scale-105' : `${st.border} hover:border-primary/50`
            }`}
          >
            {r.image_path ? (
              <img
                src={`${API_BASE}/data/${r.image_path}`}
                alt={`#${r.id}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className={`w-full h-full ${st.bg} flex items-center justify-center text-[10px] text-slate-500 font-bold`}>
                #{r.id}
              </div>
            )}
            {/* Status badge */}
            <div className={`absolute top-0.5 right-0.5 w-5 h-5 rounded-full ${st.bg} flex items-center justify-center border ${st.border}`}>
              {st.icon}
            </div>
            {/* ID label */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5 font-medium">
              #{r.id}
            </div>
          </button>
        );
      })}
    </div>
  );
}
