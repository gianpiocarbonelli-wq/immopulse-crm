import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookmarkPlus,
  Copy,
  ExternalLink,
  Globe,
  LayoutGrid,
  Layers,
  Radar,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  buildRadarPortalUrls,
  openMultiPortalWindows,
  type MultiPortalLaunchItem,
} from '../utils/portalSearch';

interface SearchPreset {
  id: string;
  label: string;
  city: string;
  maxPrice: string;
  rooms: string;
  contract: 'vendita' | 'affitto';
  onlyPrivate: boolean;
}

interface PortalRadarProps {
  defaultCity?: string;
  defaultMaxPrice?: string;
  defaultRooms?: string;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PRESETS_STORAGE_KEY = 'immopulse_radar_presets';

export function PortalRadar({
  defaultCity = 'Milano',
  defaultMaxPrice = '300000',
  defaultRooms = '3',
  onNotify,
}: PortalRadarProps) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const [city, setCity] = useState(defaultCity);
  const [maxPrice, setMaxPrice] = useState(defaultMaxPrice);
  const [rooms, setRooms] = useState(defaultRooms);
  const [contract, setContract] = useState<'vendita' | 'affitto'>('vendita');
  const [onlyPrivate, setOnlyPrivate] = useState(true);
  const [openMode, setOpenMode] = useState<'tabs' | 'grid'>('tabs');
  const [presets, setPresets] = useState<SearchPreset[]>([]);
  const [blockedFallback, setBlockedFallback] = useState<MultiPortalLaunchItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setPresets(
            parsed.map((item) => ({
              id: String(item.id ?? Date.now()),
              label: String(item.label ?? item.city ?? 'Preset'),
              city: String(item.city ?? 'Milano'),
              maxPrice: String(item.maxPrice ?? ''),
              rooms: String(item.rooms ?? ''),
              contract: item.contract === 'affitto' ? 'affitto' : 'vendita',
              onlyPrivate: Boolean(item.onlyPrivate),
            })),
          );
        }
      }
    } catch {
      // Ignore corrupted localStorage presets
    }
  }, []);

  useEffect(() => {
    if (defaultCity) setCity(defaultCity);
    if (defaultMaxPrice) setMaxPrice(defaultMaxPrice);
    if (defaultRooms) setRooms(defaultRooms);
  }, [defaultCity, defaultMaxPrice, defaultRooms]);

  const activeTargets = useMemo(
    () =>
      buildRadarPortalUrls({
        city,
        maxPrice,
        rooms,
        contract,
        onlyPrivate,
      }),
    [city, maxPrice, rooms, contract, onlyPrivate],
  );

  const launchAllPortals = (customPreset?: SearchPreset) => {
    const targets = customPreset
      ? buildRadarPortalUrls({
          city: customPreset.city,
          maxPrice: customPreset.maxPrice,
          rooms: customPreset.rooms,
          contract: customPreset.contract,
          onlyPrivate: customPreset.onlyPrivate,
        })
      : activeTargets;

    const result = openMultiPortalWindows(targets, openMode);

    if (result.blockedPortals.length > 0) {
      setBlockedFallback(result.allPortals);
      onNotify?.(
        isEn
          ? `${result.blockedPortals.length} portal tab(s) blocked by popup blocker. Click the quick buttons below.`
          : `Il browser ha bloccato ${result.blockedPortals.length} schede (pop-up). Usa i pulsanti rapidi qui sotto per aprirli in 1 clic.`,
        'info',
      );
    } else {
      setBlockedFallback([]);
      onNotify?.(
        isEn
          ? 'Opened all 4 portals simultaneously!'
          : 'Aperti tutti e 4 i portali immobiliari insieme!',
        'success',
      );
    }
  };

  const handleSavePreset = () => {
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      onNotify?.(
        isEn ? 'Enter a city before saving a preset.' : 'Inserisci un comune prima di salvare.',
        'info',
      );
      return;
    }

    const priceNum = Number(maxPrice);
    const priceLabel =
      priceNum > 0
        ? ` · ≤${priceNum >= 1000 ? `${Math.round(priceNum / 1000)}k` : priceNum}€`
        : '';
    const newPreset: SearchPreset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: `${trimmedCity.toUpperCase()}${rooms ? ` · ${rooms}+ loc` : ''}${priceLabel}`,
      city: trimmedCity,
      maxPrice,
      rooms,
      contract,
      onlyPrivate,
    };
    const updated = [newPreset, ...presets];
    setPresets(updated);
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore quota errors
    }
    onNotify?.(
      isEn ? 'Search preset saved locally.' : 'Ricerca salvata nei preset rapidi.',
      'success',
    );
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore quota errors
    }
  };

  const handleCopyAllLinks = async () => {
    const text = activeTargets.map((t) => `${t.name}: ${t.url}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      onNotify?.(
        isEn ? 'Copied all 4 portal URLs.' : 'Tutti e 4 i link copiati negli appunti.',
        'success',
      );
    } catch {
      onNotify?.(
        isEn ? 'Select a link directly below to open it.' : 'Clicca direttamente uno dei 4 portali qui sotto.',
        'info',
      );
    }
  };

  return (
    <section
      data-testid="portal-radar-widget"
      aria-label={isEn ? '4-Portal Real Estate Radar' : 'Radar 4 Portali Immobiliari'}
      className="bg-[#0b3946] border border-[#195e70] rounded-2xl p-4 sm:p-5 text-white shadow-lg"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#2eb086]/20 text-[#6ee7b7] rounded-xl shrink-0">
            <Radar className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {isEn ? '4-Portal Real Estate Radar' : 'Radar 4 Portali Immobiliari'}
            </h2>
            <p className="text-xs text-[#b7dbe2]">
              {isEn
                ? 'Launch simultaneous filtered searches on Immobiliare, Idealista, Casa & Subito'
                : 'Lancia la ricerca simultanea su Immobiliare, Idealista, Casa e Subito'}
            </p>
          </div>
        </div>

        {/* Selettore Modalità Apertura */}
        <div className="flex bg-[#072831] p-1 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            data-testid="radar-mode-tabs"
            onClick={() => setOpenMode('tabs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              openMode === 'tabs'
                ? 'bg-[#2eb086] text-[#052922] font-bold shadow'
                : 'text-[#b7dbe2] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isEn ? '4 Tabs' : '4 Schede'}</span>
          </button>
          <button
            type="button"
            data-testid="radar-mode-grid"
            onClick={() => setOpenMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              openMode === 'grid'
                ? 'bg-[#2eb086] text-[#052922] font-bold shadow'
                : 'text-[#b7dbe2] hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isEn ? '2x2 Grid (PC)' : 'Griglia 2x2 (PC)'}</span>
          </button>
        </div>
      </div>

      {/* Filtri Rapidi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div>
          <label htmlFor="radar-city" className="block text-[11px] font-semibold uppercase tracking-wider text-[#b7dbe2] mb-1">
            {isEn ? 'Municipality / Area' : 'Comune / Zona'}
          </label>
          <input
            id="radar-city"
            data-testid="radar-city-input"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={isEn ? 'e.g. Milano, Monza, Sesto San Giovanni' : 'Es. Milano, Monza, Sesto San Giovanni'}
            className="w-full bg-[#072831] border border-[#226a7c] rounded-xl px-3 py-2 text-sm text-white placeholder-[#7ca7b1] focus:outline-none focus:border-[#2eb086]"
          />
        </div>

        <div>
          <label htmlFor="radar-contract" className="block text-[11px] font-semibold uppercase tracking-wider text-[#b7dbe2] mb-1">
            {isEn ? 'Contract' : 'Contratto'}
          </label>
          <select
            id="radar-contract"
            data-testid="radar-contract-select"
            value={contract}
            onChange={(e) => setContract(e.target.value as 'vendita' | 'affitto')}
            className="w-full bg-[#072831] border border-[#226a7c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2eb086]"
          >
            <option value="vendita">{isEn ? 'For Sale' : 'Vendita'}</option>
            <option value="affitto">{isEn ? 'For Rent' : 'Affitto'}</option>
          </select>
        </div>

        <div>
          <label htmlFor="radar-max-price" className="block text-[11px] font-semibold uppercase tracking-wider text-[#b7dbe2] mb-1">
            {isEn ? 'Max Price (€)' : 'Prezzo Massimo (€)'}
          </label>
          <input
            id="radar-max-price"
            data-testid="radar-price-input"
            type="number"
            min={0}
            step={1000}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="250000"
            className="w-full bg-[#072831] border border-[#226a7c] rounded-xl px-3 py-2 text-sm text-white tabular-nums placeholder-[#7ca7b1] focus:outline-none focus:border-[#2eb086]"
          />
        </div>

        <div>
          <label htmlFor="radar-rooms" className="block text-[11px] font-semibold uppercase tracking-wider text-[#b7dbe2] mb-1">
            {isEn ? 'Min Rooms' : 'Locali Minimi'}
          </label>
          <select
            id="radar-rooms"
            data-testid="radar-rooms-select"
            value={rooms}
            onChange={(e) => setRooms(e.target.value)}
            className="w-full bg-[#072831] border border-[#226a7c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2eb086]"
          >
            <option value="">{isEn ? 'Any' : 'Qualsiasi'}</option>
            <option value="1">{isEn ? 'Studio (1+)' : 'Monolocale (1+)'}</option>
            <option value="2">{isEn ? '2-Room (2+)' : 'Bilocale (2+)'}</option>
            <option value="3">{isEn ? '3-Room (3+)' : 'Trilocale (3+)'}</option>
            <option value="4">{isEn ? '4-Room+ (4+)' : 'Quadrilocale+ (4+)'}</option>
          </select>
        </div>
      </div>

      {/* Opzione Solo Privati + Azioni */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            data-testid="radar-private-checkbox"
            checked={onlyPrivate}
            onChange={(e) => setOnlyPrivate(e.target.checked)}
            className="w-4 h-4 accent-[#2eb086] rounded"
          />
          <span className="flex items-center gap-1.5 text-xs sm:text-sm text-[#e1f4f1] font-medium">
            <UserCheck className="w-4 h-4 text-[#6ee7b7]" aria-hidden="true" />
            <span>
              {isEn ? 'Filter Private Sellers Only (Acquisition)' : 'Filtra Solo Privati (Acquisizione)'}
            </span>
          </span>
        </label>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            data-testid="radar-save-preset-btn"
            onClick={handleSavePreset}
            title={isEn ? 'Save search preset' : 'Salva questa ricerca nei preferiti'}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#072831] hover:bg-[#104654] text-[#8ef7e0] border border-[#226a7c] rounded-xl text-xs sm:text-sm font-medium transition"
          >
            <BookmarkPlus className="w-4 h-4" aria-hidden="true" />
            <span>{isEn ? 'Save' : 'Salva'}</span>
          </button>

          <button
            type="button"
            data-testid="radar-launch-all-btn"
            onClick={() => launchAllPortals()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2eb086] hover:bg-[#259b75] text-[#052922] font-bold rounded-xl shadow-md transition active:scale-95 text-xs sm:text-sm"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            <span>{isEn ? 'Open All 4 Together' : 'Apri Tutti e 4 Insieme'}</span>
          </button>
        </div>
      </div>

      {/* Direct 1-click links for each of the 4 portals (always accessible even if popups are restricted) */}
      <div className="mt-4 pt-3.5 border-t border-white/10 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#b7dbe2]">
            {isEn ? 'Direct Portal Links (1-Click):' : 'Accesso Diretto Singoli Portali (1-Clic):'}
          </span>
          <button
            type="button"
            onClick={handleCopyAllLinks}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8ef7e0] hover:text-white underline"
          >
            <Copy className="w-3 h-3" aria-hidden="true" />
            <span>{isEn ? 'Copy all 4 links' : 'Copia tutti e 4 i link'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {activeTargets.map((portal) => (
            <div
              key={portal.id}
              className="flex items-stretch rounded-xl overflow-hidden border border-[#226a7c] bg-[#072831]"
            >
              <a
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`radar-direct-${portal.host}`}
                className="flex-1 px-2.5 py-2 text-xs font-bold text-white hover:bg-[#124a59] transition flex items-center justify-center gap-1.5 truncate"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#6ee7b7] shrink-0" aria-hidden="true" />
                <span className="truncate">{portal.name}</span>
              </a>
              <a
                href={portal.googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={isEn ? `Google quick search on ${portal.name}` : `Risultati Google su ${portal.name}`}
                aria-label={isEn ? `Google quick search on ${portal.name}` : `Risultati Google su ${portal.name}`}
                className="px-2 py-2 border-l border-[#226a7c] text-[#8ef7e0] hover:bg-[#124a59] flex items-center justify-center shrink-0"
              >
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Popup-Blocked Fallback Alert (if browser blocked multiple tabs at once) */}
      {blockedFallback.length > 0 && (
        <div
          role="status"
          data-testid="radar-popup-fallback"
          className="mt-3 p-3 rounded-xl bg-amber-500/15 border border-amber-300/40 text-xs text-amber-100 space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                {isEn
                  ? 'Your browser blocked multiple simultaneous tabs. Tap any portal button above or below to open it directly:'
                  : 'Il browser ha bloccato l’apertura multipla automatica dei pop-up. Tocca i pulsanti qui sotto per aprire ogni portale senza blocchi:'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBlockedFallback([])}
              className="text-amber-200 hover:text-white font-semibold shrink-0"
            >
              {isEn ? 'Hide' : 'Chiudi'}
            </button>
          </div>
        </div>
      )}

      {/* Preset Salvati (Ricerche Ricorrenti) */}
      {presets.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#b7dbe2] mb-2">
            {isEn ? 'Saved Searches (1-Click)' : 'Ricerche Salvate (1-Clic)'}
          </p>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center bg-[#072831] border border-[#226a7c] rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => launchAllPortals(preset)}
                  className="px-3 py-1.5 text-xs font-medium text-[#8ef7e0] hover:bg-[#124a59] transition flex items-center gap-1.5"
                >
                  <Radar className="w-3 h-3" aria-hidden="true" />
                  <span>{preset.label}</span>
                  {preset.onlyPrivate && (
                    <span className="text-[10px] bg-amber-400/20 text-amber-200 px-1.5 py-0.5 rounded font-semibold">
                      {isEn ? 'Private' : 'Privati'}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePreset(preset.id)}
                  aria-label={isEn ? `Delete preset ${preset.label}` : `Elimina preset ${preset.label}`}
                  className="px-2 py-1.5 text-[#7ca7b1] hover:text-rose-300 transition border-l border-[#226a7c]"
                  title={isEn ? 'Delete' : 'Elimina'}
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
