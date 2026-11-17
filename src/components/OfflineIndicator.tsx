import { WifiOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { lang } = useLanguage();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-indicator"
      className="fixed bottom-20 md:bottom-5 left-4 z-[65] flex items-center gap-2 rounded-lg bg-amber-600 text-white border border-amber-700 px-3.5 py-2 text-xs font-semibold shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>
        {lang === 'en'
          ? 'Offline Mode — Local device data active'
          : 'Modalità Offline — Dati salvati in locale attivi'}
      </span>
    </div>
  );
}
