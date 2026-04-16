import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

type ToastProps = {
  item: ToastItem;
  onRemove: (id: string) => void;
};

const toneClasses: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

const Toast = ({ item, onRemove }: ToastProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const enterTimer = window.setTimeout(() => setVisible(true), 10);
    return () => window.clearTimeout(enterTimer);
  }, []);

  const close = () => {
    setVisible(false);
    window.setTimeout(() => onRemove(item.id), 180);
  };

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm rounded-xl border p-3 shadow-lg transition-all duration-180 ${toneClasses[item.type]} ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="min-w-0 flex-1 break-words text-sm font-medium">{item.message}</span>
        <button
          type="button"
          onClick={close}
          className="rounded p-0.5 text-xs font-bold opacity-70 hover:bg-black/5 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          x
        </button>
      </div>
    </div>
  );
};

export default Toast;
