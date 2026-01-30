import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import Toast from './Toast';
import type { ToastType } from '../types';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  onToastEmit?: (showToast: (message: string, type: ToastType) => void) => void;
}

export default function ToastContainer({ onToastEmit }: ToastContainerProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Expose showToast to parent
  if (onToastEmit) {
    onToastEmit(showToast);
  }

  return (
    <div id="toast-container" class="fixed top-4 right-4 z-[60] space-y-3">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
