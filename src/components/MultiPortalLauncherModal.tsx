import { useEffect } from 'react';
import { AlertCircle, Copy, ExternalLink, Globe, Search, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { MultiPortalLaunchItem } from '../utils/portalSearch';

interface MultiPortalLauncherModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  portals: MultiPortalLaunchItem[];
  blockedCount: number;
  onClose: () => void;
  onCopyAll: () => void;
}

export function MultiPortalLauncherModal({
  isOpen,
  title,
  subtitle,
  portals,
  blockedCount,
  onClose,
  onCopyAll,
}: MultiPortalLauncherModalProps) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || portals.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-launcher-title"
      data-testid="multi-portal-launcher-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-[#092b35]/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-backdrop"
    >
      <div className="bg-white border border-[#cbe2de] w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-bottom-sheet">
        <div className="px-5 py-4 border-b border-[#e1f0ed] bg-[#f4faf9] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-5 h-5 text-[#177858] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="portal-launcher-title" className="text-sm sm:text-base font-bold text-[#0e4d5f] truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-[#4a707a] truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? 'Close portal launcher' : 'Chiudi elenco portali'}
            className="p-1.5 rounded-lg text-[#5a808a] hover:text-[#0e4d5f] hover:bg-[#e1f0ed]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {blockedCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                {isEn
                  ? `Your browser blocked ${blockedCount} simultaneous tab(s). Click any portal below to open it immediately:`
                  : `Il browser ha bloccato l'apertura automatica di ${blockedCount} schede (blocco pop-up). Clicca qui sotto per aprire subito ogni portale:`}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {portals.map((portal) => (
              <div
                key={portal.id ?? portal.name}
                className="flex flex-col gap-1.5 p-3 rounded-xl border border-[#cbe2de] bg-[#f4faf9]"
              >
                <div className="text-xs font-bold text-[#0e4d5f]">{portal.name}</div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`modal-open-${portal.host ?? portal.name}`}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#177858] hover:bg-[#0e4d5f] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{isEn ? 'Open Portal' : 'Apri Portale'}</span>
                  </a>
                  {portal.googleUrl && (
                    <a
                      href={portal.googleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={isEn ? 'Quick Google Results' : 'Risultati Rapidi Google'}
                      aria-label={isEn ? `Google results for ${portal.name}` : `Risultati Google per ${portal.name}`}
                      className="py-2 px-2.5 rounded-lg bg-white hover:bg-[#e1f0ed] text-[#0e4d5f] border border-[#cbe2de] inline-flex items-center justify-center"
                    >
                      <Globe className="w-3.5 h-3.5 text-[#177858]" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#e1f0ed]">
            <button
              type="button"
              onClick={onCopyAll}
              className="px-3.5 py-2 rounded-lg bg-[#eef6f5] hover:bg-[#dceceb] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isEn ? 'Copy all 4 links' : 'Copia tutti e 4 i link'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold"
            >
              {isEn ? 'Done' : 'Chiudi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
