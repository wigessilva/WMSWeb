import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  children: React.ReactNode;
  zIndexClass?: string;
  fundoTransparente?: boolean;
}

export function Modal({
  isOpen,
  children,
  zIndexClass = "z-[1000]", // Valor padrão
  fundoTransparente = false
}: ModalProps) {

  if (!isOpen) return null;

  return createPortal(
    <div className={`fixed inset-0 flex items-center justify-center p-4 ${zIndexClass} ${fundoTransparente ? 'bg-transparent' : 'bg-black bg-opacity-50'}`}>
      {children}
    </div>,
    document.body
  );
}