import { h } from 'preact';
import { useEffect } from 'preact/hooks';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: h.JSX.Element | h.JSX.Element[];
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div class="modal">
      <div class="modal-overlay" onClick={onClose} />
      <div class={`modal-content ${maxWidthClasses[maxWidth]}`}>
        <div class="modal-header">
          <h3 class="text-xl font-serif text-[var(--color-anjou-brown)]">{title}</h3>
          <button class="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div class="modal-body">{children}</div>
      </div>
    </div>
  );
}
