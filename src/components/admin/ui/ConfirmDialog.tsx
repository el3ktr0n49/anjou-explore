import { h } from 'preact';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message: string;
  details?: string[];
}

export default function ConfirmDialog({ isOpen, onConfirm, onCancel, message, details }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div class="modal">
      <div class="modal-overlay" onClick={onCancel} />
      <div class="modal-content max-w-md">
        <div class="modal-header border-b-2 border-red-200">
          <h3 class="text-xl font-serif text-red-700 flex items-center">
            <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Confirmation
          </h3>
          <button class="modal-close" onClick={onCancel} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div class="modal-body">
          <p class="text-[var(--color-anjou-brown)] mb-6">{message}</p>
          {details && details.length > 0 && (
            <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
              <p class="text-sm text-red-700 font-semibold mb-2">Cette action supprimera :</p>
              <ul class="text-sm text-red-600 list-disc list-inside space-y-1">
                {details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          )}
          <div class="flex justify-end gap-3">
            <button onClick={onCancel} class="btn-secondary">
              Annuler
            </button>
            <button
              onClick={onConfirm}
              class="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
