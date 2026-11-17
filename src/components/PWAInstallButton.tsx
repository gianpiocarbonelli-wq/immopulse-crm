import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Download, Share, Smartphone, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    if (!showGuideModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuideModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showGuideModal]);

  if (isInstalled) {
    return (
      <span
        data-testid="pwa-installed-badge"
        className="px-2.5 py-1.5 rounded-lg bg-[#e6f7f1] text-[#177858] border border-[#2eb086]/40 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
      >
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{lang === 'en' ? 'App Installed' : 'App Installata'}</span>
      </span>
    );
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
        <span>{lang === 'en' ? 'Install App' : 'Installa App'}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        data-testid={isIOS ? 'pwa-install-ios-button' : 'pwa-install-guide-button'}
        onClick={() => setShowGuideModal(true)}
        className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
      >
        <Smartphone className="w-3.5 h-3.5 text-[#2eb086]" aria-hidden="true" />
        <span>
          {isIOS
            ? lang === 'en'
              ? 'Install on iOS'
              : 'Installa su iOS'
            : lang === 'en'
              ? 'PWA App'
              : 'App PWA'}
        </span>
      </button>

      {showGuideModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowGuideModal(false);
            }}
            className="fixed inset-0 z-[60] bg-[#092b35]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-backdrop"
          >
            <div className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-white border border-[#cbe2de] p-6 shadow-2xl space-y-4 animate-bottom-sheet">
              <div className="flex items-center justify-between gap-2">
                <h3 id="pwa-install-title" className="text-base font-bold text-[#0e4d5f] flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#2eb086]" aria-hidden="true" />
                  <span>
                    {isIOS
                      ? lang === 'en'
                        ? 'Install on iPhone / iPad'
                        : 'Installa su iPhone / iPad'
                      : lang === 'en'
                        ? 'Install ImmoPulse as App'
                        : 'Installa ImmoPulse come App'}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  aria-label={
                    lang === 'en'
                      ? 'Close PWA installation instructions'
                      : 'Chiudi istruzioni installazione PWA'
                  }
                  className="p-1 text-[#5a808a] hover:text-[#0e4d5f]"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {isIOS ? (
                lang === 'en' ? (
                  <ol className="text-xs text-[#3b5e68] space-y-2 list-decimal list-inside leading-relaxed">
                    <li>
                      Tap the{' '}
                      <strong className="inline-flex items-center gap-1 text-[#0e4d5f]">
                        <Share className="w-3.5 h-3.5 inline" aria-hidden="true" /> Share
                      </strong>{' '}
                      button in Safari&apos;s toolbar.
                    </li>
                    <li>
                      Scroll down and tap{' '}
                      <strong className="text-[#0e4d5f]">Add to Home Screen</strong>.
                    </li>
                    <li>
                      Confirm by tapping <strong className="text-[#0e4d5f]">Add</strong> at the top right.
                    </li>
                  </ol>
                ) : (
                  <ol className="text-xs text-[#3b5e68] space-y-2 list-decimal list-inside leading-relaxed">
                    <li>
                      Tocca il pulsante{' '}
                      <strong className="inline-flex items-center gap-1 text-[#0e4d5f]">
                        <Share className="w-3.5 h-3.5 inline" aria-hidden="true" /> Condividi
                      </strong>{' '}
                      nella barra di Safari.
                    </li>
                    <li>
                      Scorri verso il basso e tocca{' '}
                      <strong className="text-[#0e4d5f]">Aggiungi alla schermata Home</strong>.
                    </li>
                    <li>
                      Conferma toccando <strong className="text-[#0e4d5f]">Aggiungi</strong> in alto a destra.
                    </li>
                  </ol>
                )
              ) : lang === 'en' ? (
                <div className="space-y-2.5 text-xs text-[#3b5e68] leading-relaxed">
                  <p>
                    ImmoPulse is a <strong className="text-[#0e4d5f]">Progressive Web App</strong> ready to work offline right on your device.
                  </p>
                  <ol className="space-y-1.5 list-decimal list-inside">
                    <li>
                      Open the app in a dedicated browser tab (Chrome, Edge, or Safari).
                    </li>
                    <li>
                      Click the <strong className="text-[#0e4d5f]">Install</strong> icon in the address bar or choose <strong className="text-[#0e4d5f]">⋮ → Install ImmoPulse</strong>.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs text-[#3b5e68] leading-relaxed">
                  <p>
                    ImmoPulse è una <strong className="text-[#0e4d5f]">Progressive Web App</strong> pronta per lavorare anche offline sul tuo dispositivo.
                  </p>
                  <ol className="space-y-1.5 list-decimal list-inside">
                    <li>
                      Apri l&apos;app in una scheda dedicata del browser (Chrome, Edge o Safari).
                    </li>
                    <li>
                      Premi l&apos;icona <strong className="text-[#0e4d5f]">Installa</strong> nella barra degli indirizzi oppure dal menu <strong className="text-[#0e4d5f]">⋮ → Installa ImmoPulse</strong>.
                    </li>
                  </ol>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] py-2 text-xs font-semibold text-white transition-colors"
              >
                {lang === 'en' ? 'Got it' : 'Ho capito'}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
