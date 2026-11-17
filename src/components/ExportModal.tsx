import { type ChangeEvent, useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight, Database, FileJson, FileSpreadsheet, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { ClientRecord } from '../types/crm';
import { isValidClient, normalizeClientRecord } from '../utils/crmLogic';

interface ExportModalProps {
  isOpen: boolean;
  clientLimit: number;
  onClose: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportJson: (imported: ClientRecord[]) => void;
  onLimitExceeded: (count: number) => void;
}

export function ExportModal({
  isOpen,
  clientLimit,
  onClose,
  onExportCsv,
  onExportJson,
  onImportJson,
  onLimitExceeded,
}: ExportModalProps) {
  const { lang } = useLanguage();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg(
        lang === 'en'
          ? 'Backup file is too large (maximum 20 MB).'
          : 'Backup troppo grande (massimo 20 MB).',
      );
      return;
    }

    const reader = new FileReader();
    reader.onerror = () =>
      setErrorMsg(
        lang === 'en'
          ? 'Unable to read the selected file.'
          : 'Impossibile leggere il file selezionato.',
      );
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(String(evt.target?.result ?? ''));
        if (!Array.isArray(parsed) || !parsed.every(isValidClient)) {
          throw new Error('Invalid backup format');
        }
        if (parsed.length > clientLimit) {
          onClose();
          onLimitExceeded(parsed.length);
          return;
        }
        const normalized = parsed.map(normalizeClientRecord);
        onImportJson(normalized);
      } catch {
        setErrorMsg(
          lang === 'en'
            ? 'Invalid or corrupted backup file. Your current archive remains unchanged.'
            : 'Backup non valido o danneggiato. L’archivio attuale è rimasto invariato.',
        );
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-[#092b35]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-backdrop"
    >
      <div className="bg-white border border-[#cbe2de] w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-4 shadow-2xl animate-bottom-sheet">
        <div className="flex justify-between items-center">
          <h2 id="export-modal-title" className="font-bold text-base text-[#0e4d5f] flex items-center gap-2">
            <Database className="w-5 h-5 text-[#2eb086]" aria-hidden="true" />{' '}
            {lang === 'en' ? 'Backup & Export' : 'Backup e Esportazione'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'en' ? 'Close backup modal' : 'Chiudi finestra backup'}
            className="p-1 text-[#5a808a] hover:text-[#0e4d5f]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-[#4a707a]">
          {lang === 'en'
            ? 'Export your clients for agency reports or save and restore a local JSON backup.'
            : "Esporta i tuoi clienti per report d'agenzia oppure salva o ripristina un backup JSON locale."}
        </p>

        <div
          data-testid="backup-security-notice"
          className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            {lang === 'en' ? (
              <>
                <strong>Important:</strong> Free and Individual plan data is stored in your device&apos;s
                local memory. Download your Backup file regularly to avoid losing your contacts if you
                switch phones or clear browser history.
              </>
            ) : (
              <>
                <strong>Importante:</strong> I dati del piano Free e Singolo vengono salvati nella
                memoria del tuo dispositivo. Scarica periodicamente il file di Backup per non perdere
                i tuoi contatti in caso di cambio telefono o pulizia della cronologia.
              </>
            )}
          </p>
        </div>

        {errorMsg && (
          <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={onExportCsv}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-[#f4faf9] hover:bg-[#e4f3f0] text-[#0e4d5f] border border-[#cbe2de] text-xs font-medium transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#2eb086]" aria-hidden="true" />{' '}
              {lang === 'en' ? 'Export Excel Spreadsheet (.CSV)' : 'Esporta Foglio Excel (.CSV)'}
            </span>
            <ChevronRight className="w-4 h-4 text-[#5a808a]" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onExportJson}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-[#f4faf9] hover:bg-[#e4f3f0] text-[#0e4d5f] border border-[#cbe2de] text-xs font-medium transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-[#0e4d5f]" aria-hidden="true" />{' '}
              {lang === 'en' ? 'Download Full Backup (.JSON)' : 'Scarica Backup Completo (.JSON)'}
            </span>
            <ChevronRight className="w-4 h-4 text-[#5a808a]" aria-hidden="true" />
          </button>

          <div className="pt-2">
            <label htmlFor="import-file" className="block text-xs font-semibold text-[#0e4d5f] mb-1.5">
              {lang === 'en' ? 'Restore Backup (.JSON)' : 'Ripristina Backup (.JSON)'}
            </label>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="w-full text-xs text-[#4a707a] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#eef6f5] file:text-[#0e4d5f] hover:file:bg-[#dff0ed]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
