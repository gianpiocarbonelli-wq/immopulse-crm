import { type ChangeEvent, useEffect, useState } from 'react';
import { ChevronRight, Database, FileJson, FileSpreadsheet, X } from 'lucide-react';
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
      setErrorMsg('Backup troppo grande (massimo 20 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setErrorMsg('Impossibile leggere il file selezionato.');
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(String(evt.target?.result ?? ''));
        if (!Array.isArray(parsed) || !parsed.every(isValidClient)) {
          throw new Error('Formato backup non valido');
        }
        if (parsed.length > clientLimit) {
          onClose();
          onLimitExceeded(parsed.length);
          return;
        }
        const normalized = parsed.map(normalizeClientRecord);
        onImportJson(normalized);
      } catch {
        setErrorMsg('Backup non valido o danneggiato. L’archivio attuale è rimasto invariato.');
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
      className="fixed inset-0 z-50 bg-[#092b35]/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-[#cbe2de] w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center">
          <h2 id="export-modal-title" className="font-bold text-base text-[#0e4d5f] flex items-center gap-2">
            <Database className="w-5 h-5 text-[#2eb086]" aria-hidden="true" /> Backup e Esportazione
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra backup"
            className="p-1 text-[#5a808a] hover:text-[#0e4d5f]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-[#4a707a]">
          Esporta i tuoi clienti per report d&apos;agenzia oppure salva o ripristina un backup JSON locale.
        </p>

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
              <FileSpreadsheet className="w-4 h-4 text-[#2eb086]" aria-hidden="true" /> Esporta Foglio Excel (.CSV)
            </span>
            <ChevronRight className="w-4 h-4 text-[#5a808a]" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onExportJson}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-[#f4faf9] hover:bg-[#e4f3f0] text-[#0e4d5f] border border-[#cbe2de] text-xs font-medium transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-[#0e4d5f]" aria-hidden="true" /> Scarica Backup Completo (.JSON)
            </span>
            <ChevronRight className="w-4 h-4 text-[#5a808a]" aria-hidden="true" />
          </button>

          <div className="pt-2">
            <label htmlFor="import-file" className="block text-xs font-semibold text-[#0e4d5f] mb-1.5">
              Ripristina Backup (.JSON)
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
