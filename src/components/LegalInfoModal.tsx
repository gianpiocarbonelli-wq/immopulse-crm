import { FileText, ShieldCheck, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getLegalDocument,
  getLegalDocumentsMap,
  LEGAL_DOC_ORDER,
  type LegalDocKey,
} from '../utils/legalAndSupport';

interface LegalInfoModalProps {
  docKey: LegalDocKey | null;
  onSelectDoc: (key: LegalDocKey) => void;
  onClose: () => void;
}

export function LegalInfoModal({ docKey, onSelectDoc, onClose }: LegalInfoModalProps) {
  const { lang } = useLanguage();
  if (!docKey) return null;

  const docsMap = getLegalDocumentsMap(lang);
  const doc = getLegalDocument(docKey, lang);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      data-testid="legal-info-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-[#092b35]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-backdrop"
    >
      <div className="bg-white border border-[#cbe2de] w-full max-w-3xl rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl sm:my-auto flex flex-col max-h-[92vh] animate-bottom-sheet">
        <div className="px-6 py-4 border-b border-[#e1f0ed] flex items-center justify-between gap-3 bg-[#f4faf9] sticky top-0 z-10">
          <div className="min-w-0">
            <h2
              id="legal-modal-title"
              className="font-bold text-base text-[#0e4d5f] flex items-center gap-2"
            >
              <ShieldCheck className="w-5 h-5 text-[#2eb086] shrink-0" aria-hidden="true" />
              <span className="truncate">{doc.title}</span>
            </h2>
            <p className="text-xs text-[#4a707a] mt-0.5">{doc.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'en' ? 'Close legal notice' : 'Chiudi informativa legale'}
            className="p-1.5 rounded-lg text-[#5a808a] hover:text-[#0e4d5f] shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Document switcher tabs */}
        <div
          role="tablist"
          aria-label={lang === 'en' ? 'Legal documents' : 'Documenti legali'}
          className="px-6 py-2.5 bg-[#f9fcfc] border-b border-[#e1f0ed] flex flex-wrap gap-2"
        >
          {LEGAL_DOC_ORDER.map((key) => {
            const item = docsMap[key];
            const isActive = key === docKey;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectDoc(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#0e4d5f] text-white'
                    : 'bg-white text-[#3b5e68] border border-[#cbe2de] hover:bg-[#eef6f5]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm leading-relaxed text-[#25454e]">
          {doc.sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h3 className="font-bold text-sm text-[#0e4d5f]">{section.heading}</h3>
              {section.paragraphs.map((paragraph, idx) => (
                <p key={idx} className="text-xs sm:text-sm text-[#3b5e68] leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="px-6 py-3.5 border-t border-[#e1f0ed] bg-[#f4faf9] flex flex-wrap items-center justify-between gap-2 text-xs text-[#4a707a]">
          <span>
            {lang === 'en' ? 'Last updated:' : 'Ultimo aggiornamento:'} {doc.lastUpdated}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white font-semibold text-xs transition-colors"
          >
            {lang === 'en' ? 'Close' : 'Chiudi'}
          </button>
        </div>
      </div>
    </div>
  );
}
