import { AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { ConfirmDialogState } from '../types/crm';

interface ConfirmDialogProps {
  dialog: ConfirmDialogState | null;
  onCancel: () => void;
}

export function ConfirmDialog({ dialog, onCancel }: ConfirmDialogProps) {
  const { lang } = useLanguage();
  if (!dialog) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-[60] bg-[#092b35]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-backdrop"
    >
      <div className="bg-white border border-[#cbe2de] w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-4 shadow-2xl animate-bottom-sheet">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={`w-5 h-5 shrink-0 ${
                dialog.variant === 'danger' ? 'text-rose-600' : 'text-amber-600'
              }`}
              aria-hidden="true"
            />
            <h2 id="confirm-dialog-title" className="font-bold text-base text-[#0e4d5f]">
              {dialog.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={lang === 'en' ? 'Close confirmation' : 'Chiudi conferma'}
            className="p-1 text-[#5a808a] hover:text-[#0e4d5f]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-[#3b5e68] leading-relaxed">{dialog.message}</p>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-[#eef6f5] hover:bg-[#dceceb] text-[#3b5e68] text-xs font-semibold"
          >
            {lang === 'en' ? 'Cancel' : 'Annulla'}
          </button>
          <button
            type="button"
            onClick={() => {
              dialog.onConfirm();
              onCancel();
            }}
            className={`px-4 py-2 rounded-lg text-white text-xs font-semibold ${
              dialog.variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#0e4d5f] hover:bg-[#0a3c4a]'
            }`}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
