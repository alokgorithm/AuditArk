import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

const Modal = ({ isOpen, onClose, children }: ModalProps) => {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      return;
    }

    const timer = window.setTimeout(() => setShouldRender(false), 180);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4 transition-opacity duration-180 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-lg rounded-2xl bg-white shadow-2xl transition-all duration-180 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;