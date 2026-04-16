import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Toast from './Toast';
import type { ToastItem, ToastType } from './Toast';

type ToastContextValue = {
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 5;

const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType, duration = 3000) => {
    const id = crypto.randomUUID();
    const item: ToastItem = { id, message, type, duration };

    setToasts((prev) => {
      const next = [...prev, item];
      if (next.length > MAX_TOASTS) {
        return next.slice(next.length - MAX_TOASTS);
      }
      return next;
    });

    window.setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const value = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[1200] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((item) => (
          <Toast key={item.id} item={item} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export default ToastProvider;
