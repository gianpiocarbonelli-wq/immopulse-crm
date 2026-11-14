import { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (!showIOSGuide) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowIOSGuide(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showIOSGuide]);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        data-testid="pwa-install-button"
        onClick={() => {
          void install();
        }}
        className="px-3 py-1.5 rounded-lg bg-[#177858] hover:bg-[#125f46] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
      >
        <Download className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Installa App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          data-testid="pwa-install-ios-button"
          onClick={() => setShowIOSGuide(true)}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#2eb086]" aria-hidden="true" />
          <span>Installa su iOS</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowIOSGuide(false);
            }}
            className="fixed inset-0 z-50 bg-[#092b35]/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm rounded-2xl bg-white border border-[#cbe2de] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 id="ios-install-title" className="text-base font-bold text-[#0e4d5f] flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#2eb086]" aria-hidden="true" />
                  <span>Installa su iPhone / iPad</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Chiudi istruzioni installazione iOS"
                  className="p-1 text-[#5a808a] hover:text-[#0e4d5f]"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
              <ol className="text-xs text-[#3b5e68] space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  Tocca il pulsante <strong className="inline-flex items-center gap-1 text-[#0e4d5f]"><Share className="w-3.5 h-3.5 inline" aria-hidden="true" /> Condividi</strong> nella barra di Safari.
                </li>
                <li>
                  Scorri verso il basso e tocca <strong className="text-[#0e4d5f]">Aggiungi alla schermata Home</strong>.
                </li>
                <li>
                  Conferma toccando <strong className="text-[#0e4d5f]">Aggiungi</strong> in alto a destra.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] py-2 text-xs font-semibold text-white transition-colors"
              >
                Ho capito
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
