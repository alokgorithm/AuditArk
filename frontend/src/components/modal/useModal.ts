import { createContext, createElement, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import ConfirmModal from './ConfirmModal';
import ExportOptionsModal from '../ExportOptionsModal';
import type { ExportMode } from '../ExportOptionsModal';

type ConfirmModalOptions = {
  title: string;
  message: string;
  confirmText?: string;
  secondaryText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onSecondary?: () => void;
  onCancel?: () => void;
};

type ExportOptionsModalOptions = {
  askEveryTime: boolean;
  defaultPath: string | null;
  onAskEveryTimeChange: (value: boolean) => void;
  onSetDefaultFolder: () => Promise<string | null>;
  onContinue: (mode: ExportMode) => void;
  onCancel?: () => void;
};

export type ModalState = {
  isOpen: boolean;
  type: 'confirm' | 'export-options' | null;
  props: ConfirmModalOptions | ExportOptionsModalOptions | null;
};

type ModalContextValue = {
  modal: ModalState;
  openConfirm: (options: ConfirmModalOptions) => void;
  openExportOptions: (options: ExportOptionsModalOptions) => void;
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: null,
    props: null,
  });

  const closeModal = useCallback(() => {
    setModal({ isOpen: false, type: null, props: null });
  }, []);

  const openConfirm = useCallback((options: ConfirmModalOptions) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      props: options,
    });
  }, []);

  const openExportOptions = useCallback((options: ExportOptionsModalOptions) => {
    setModal({
      isOpen: true,
      type: 'export-options',
      props: options,
    });
  }, []);

  const value = useMemo(
    () => ({ modal, openConfirm, openExportOptions, closeModal }),
    [modal, openConfirm, openExportOptions, closeModal]
  );

  return createElement(
    ModalContext.Provider,
    { value },
    children,
    modal.type === 'confirm' && modal.props
      ? createElement(ConfirmModal, {
          isOpen: modal.isOpen,
          title: (modal.props as ConfirmModalOptions).title,
          message: (modal.props as ConfirmModalOptions).message,
          confirmText: (modal.props as ConfirmModalOptions).confirmText,
          secondaryText: (modal.props as ConfirmModalOptions).secondaryText,
          cancelText: (modal.props as ConfirmModalOptions).cancelText,
          onConfirm: () => {
            (modal.props as ConfirmModalOptions)?.onConfirm();
            closeModal();
          },
          onSecondary: () => {
            (modal.props as ConfirmModalOptions)?.onSecondary?.();
            closeModal();
          },
          onCancel: () => {
            (modal.props as ConfirmModalOptions)?.onCancel?.();
            closeModal();
          },
        })
      : modal.type === 'export-options' && modal.props
        ? createElement(ExportOptionsModal, {
            isOpen: modal.isOpen,
            askEveryTime: (modal.props as ExportOptionsModalOptions).askEveryTime,
            defaultPath: (modal.props as ExportOptionsModalOptions).defaultPath,
            onAskEveryTimeChange: (modal.props as ExportOptionsModalOptions).onAskEveryTimeChange,
            onSetDefaultFolder: (modal.props as ExportOptionsModalOptions).onSetDefaultFolder,
            onContinue: (mode: ExportMode) => {
              (modal.props as ExportOptionsModalOptions).onContinue(mode);
              closeModal();
            },
            onCancel: () => {
              (modal.props as ExportOptionsModalOptions).onCancel?.();
              closeModal();
            },
          })
      : null
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
