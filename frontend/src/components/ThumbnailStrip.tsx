import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import type { ReceiptFile } from '../hooks/useFileUpload';
import StatusBadge from './StatusBadge';

type ThumbnailStripProps = {
  files: ReceiptFile[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  selectedIds?: string[];
  toggleSelect?: (id: string) => void;
  onDeleteImage?: (id: string) => void;
};

const ThumbnailStrip = ({
  files,
  activeIndex,
  setActiveIndex,
  onDeleteImage,
}: ThumbnailStripProps) => {
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeIndex]);

  if (files.length === 0) return null;

  return (
    <div className="flex w-24 flex-col bg-slate-50 border-r border-slate-200 overflow-hidden h-full">
      <div className="p-3 border-b border-slate-200 bg-white z-10 shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">
          Thumbnails
        </p>
      </div>
      <div 
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-3"
        style={{ scrollbarWidth: 'none' /* Hide scrollbar for cleaner look */ }}
      >
        {files.map((file, index) => (
          <button
            key={file.id}
            ref={activeIndex === index ? activeThumbRef : undefined}
            onClick={() => setActiveIndex(index)}
            className={`
              relative shrink-0 w-full aspect-square rounded-lg overflow-hidden border-2 transition-all duration-150 focus:outline-none bg-white
              ${activeIndex === index
                ? 'border-blue-500 ring-2 ring-blue-200 shadow-md scale-105'
                : 'border-slate-200 hover:border-blue-300 shadow-sm opacity-80 hover:opacity-100'
              }
            `}
          >
            <img
              src={file.preview}
              alt={file.file.name}
              className="w-full h-full object-cover"
            />

            {onDeleteImage && (
              <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteImage(file.id);
                  }}
                  className="rounded bg-red-500/90 p-1 text-white hover:bg-red-600"
                  aria-label="Delete image"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}

            {/* Active Index */}
            <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded px-1.5 py-0.5 pointer-events-none">
              R{index + 1}
            </div>
            
            {/* Status Dot */}
            <div className="absolute bottom-1 right-1 pointer-events-none">
                <StatusBadge status={file.status} compact />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThumbnailStrip;
