import { type FormEvent, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Copy,
  ExternalLink,
  Globe,
  Layers,
  LayoutGrid,
  MapPin,
  Search,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { ClientRecord, PropertyPortalConfig } from '../types/crm';
import { formatCurrencyEUR } from '../utils/crmLogic';
import { translatePropertyType, translateRole } from '../utils/i18n';
import {
  DEFAULT_ITALIAN_PORTALS,
  type MultiPortalLaunchItem,
  type SimplePortalSearchInput,
  buildDirectPortalSearchUrl,
  buildGooglePortalQuickSearchUrl,
  buildSimplePortalQuery,
  extractClientCityAndZone,
  extractPortalHostname,
  openMultiPortalWindows,
  resolveSimplePortalSearchInput,
} from '../utils/portalSearch';

interface FindPropertyViewProps {
  portals: PropertyPortalConfig[];
  clients?: ClientRecord[];
  onUpdatePortals?: (next: PropertyPortalConfig[]) => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const CORE_PORTAL_HOSTS = ['immobiliare.it', 'idealista.it', 'subito.it', 'casa.it'] as const;

const PORTAL_META: Record<
  string,
  { badgeBg: string; badgeText: string; taglineIt: string; taglineEn: string }
> = {
  'immobiliare.it': {
    badgeBg: 'bg-sky-50 border-sky-200',
    badgeText: 'text-sky-800',
    taglineIt: 'Link diretto per città normalizzata e prezzo massimo',
    taglineEn: 'Direct city link with contract & max price filter',
  },
  'idealista.it': {
    badgeBg: 'bg-lime-50 border-lime-200',
    badgeText: 'text-lime-800',
    taglineIt: 'Link diretto Idealista.it per città/provincia e prezzo',
    taglineEn: 'Direct Idealista.it link by city/province & max price',
  },
  'subito.it': {
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-800',
    taglineIt: 'Categoria immobili con città, parole chiave e prezzo',
    taglineEn: 'Real estate category with city, keywords & price',
  },
  'casa.it': {
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
    taglineIt: 'Percorso diretto Casa.it per città, contratto e priceMax',
    taglineEn: 'Direct Casa.it city path with contract & max price',
  },
};

export function FindPropertyView({
  portals,
  clients = [],
  onNotify,
}: FindPropertyViewProps) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [contract, setContract] = useState<'tutti' | 'vendita' | 'affitto'>('vendita');
  const [cityZone, setCityZone] = useState<string>('Milano');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [openMode, setOpenMode] = useState<'tabs' | 'grid'>('tabs');
  const [highlightCards, setHighlightCards] = useState(false);
  const [blockedFallback, setBlockedFallback] = useState<MultiPortalLaunchItem[]>([]);

  // Always resolve the 4 Italian portals cleanly in fixed order
  const fourPortals = useMemo<PropertyPortalConfig[]>(() => {
    return CORE_PORTAL_HOSTS.map((host) => {
      const matched = portals.find((p) => extractPortalHostname(p.url) === host);
      if (matched) return matched;
      return DEFAULT_ITALIAN_PORTALS.find((p) => extractPortalHostname(p.url) === host)!;
    });
  }, [portals]);

  const activeInput = useMemo<SimplePortalSearchInput>(
    () =>
      resolveSimplePortalSearchInput({
        query: searchQuery,
        contract,
        cityZone,
        maxPrice,
      }),
    [searchQuery, contract, cityZone, maxPrice],
  );

  const builtSummaryQuery = useMemo(
    () => buildSimplePortalQuery(activeInput),
    [activeInput],
  );

  const portalCards = useMemo(() => {
    return fourPortals.map((portal) => {
      const host = extractPortalHostname(portal.url);
      const directUrl = buildDirectPortalSearchUrl(portal, activeInput);
      const googleUrl = buildGooglePortalQuickSearchUrl(portal, activeInput);
      const meta = PORTAL_META[host] ?? {
        badgeBg: 'bg-[#f4faf9] border-[#cbe2de]',
        badgeText: 'text-[#0e4d5f]',
        taglineIt: 'Ricerca diretta sul portale',
        taglineEn: 'Direct portal search',
      };
      return {
        portal,
        host,
        directUrl,
        googleUrl,
        meta,
      };
    });
  }, [fourPortals, activeInput]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    if (!clientId) return;

    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const nextContract: 'vendita' | 'affitto' =
      client.role === 'Inquilino' || client.role === 'Locatore' ? 'affitto' : 'vendita';
    const { cityZone: resolvedCityZone } = extractClientCityAndZone(client.zone, client.address);
    const nextMaxPrice = client.price > 0 ? String(Math.round(client.price)) : '';
    const parts = [
      client.propertyType?.trim(),
      nextContract,
      resolvedCityZone,
      nextMaxPrice,
    ].filter(Boolean);

    setContract(nextContract);
    setCityZone(resolvedCityZone || 'Milano');
    setMaxPrice(nextMaxPrice);
    setSearchQuery(parts.join(' '));
    setBlockedFallback([]);
    setHighlightCards(true);
    window.setTimeout(() => setHighlightCards(false), 700);

    onNotify(
      isEn
        ? `Search populated from ${client.name}`
        : `Ricerca compilata dai dati di ${client.name}`,
      'info',
    );
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!builtSummaryQuery) {
      onNotify(
        isEn
          ? 'Enter keywords, city/area, or max price to prepare portal links.'
          : 'Inserisci parole chiave, città/zona o prezzo massimo per preparare i link.',
        'info',
      );
      return;
    }

    // Sync detected city/price/contract back into visible filters when user typed only in main bar
    if (!cityZone.trim() && activeInput.cityZone) {
      setCityZone(activeInput.cityZone);
    }
    if (!maxPrice.trim() && activeInput.maxPrice) {
      setMaxPrice(activeInput.maxPrice);
    }
    if (activeInput.contract !== contract) {
      setContract(activeInput.contract);
    }

    setBlockedFallback([]);
    setHighlightCards(true);
    window.setTimeout(() => setHighlightCards(false), 700);
    onNotify(
      isEn
        ? 'All 4 portal searches are ready below.'
        : 'Link di ricerca pronti per tutti e 4 i portali!',
      'success',
    );
  };

  const handleOpenAllFour = () => {
    const launchList: MultiPortalLaunchItem[] = portalCards.map((card) => ({
      id: card.portal.id,
      name: card.portal.name,
      host: card.host,
      url: card.directUrl,
      googleUrl: card.googleUrl,
    }));

    const result = openMultiPortalWindows(launchList, openMode);

    if (result.blockedPortals.length > 0) {
      setBlockedFallback(result.blockedPortals);
      onNotify(
        isEn
          ? `Browser blocked ${result.blockedPortals.length} tab(s). Use the instant launch buttons below.`
          : `Il browser ha bloccato ${result.blockedPortals.length} schede (pop-up). Usa i pulsanti diretti qui sotto per aprirli in 1 clic.`,
        'info',
      );
    } else {
      setBlockedFallback([]);
      onNotify(
        isEn
          ? 'Opened all 4 property portals together.'
          : 'Aperti tutti e 4 i portali immobiliari insieme.',
        'success',
      );
    }
  };

  const handleCopyAllLinks = async () => {
    const text = portalCards.map((c) => `${c.portal.name}: ${c.directUrl}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      onNotify(
        isEn ? 'All 4 portal URLs copied to clipboard.' : 'Tutti e 4 i link copiati negli appunti.',
        'success',
      );
    } catch {
      onNotify(
        isEn ? 'Use the direct portal buttons below.' : 'Usa i pulsanti diretti dei 4 portali qui sotto.',
        'info',
      );
    }
  };

  const formatContractLabel = (value: 'tutti' | 'vendita' | 'affitto') => {
    if (value === 'vendita') return isEn ? 'For Sale' : 'Vendita';
    if (value === 'affitto') return isEn ? 'For Rent' : 'Affitto';
    return isEn ? 'All' : 'Tutti';
  };

  const effectiveContract = activeInput.contract;
  const effectiveCity = activeInput.cityZone.trim();
  const effectivePriceDigits = activeInput.maxPrice.replace(/[^0-9]/g, '');
  const formattedBudget = effectivePriceDigits
    ? formatCurrencyEUR(Number(effectivePriceDigits), lang)
    : '';

  return (
    <div className="space-y-5">
      {/* Top Simplified Search Card */}
      <section className="bg-white border border-[#cbe2de] rounded-xl shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#eaf3f2]">
          <div>
            <h2 className="text-lg font-extrabold text-[#0e4d5f] flex items-center gap-2">
              <Search className="w-5 h-5 text-[#177858]" aria-hidden="true" />
              <span>{isEn ? 'Find Property on 4 Portals' : 'Cerca Immobile sui 4 Portali'}</span>
            </h2>
            <p className="text-xs text-[#4f727d] mt-0.5">
              {isEn
                ? 'One search bar, direct filtered links for Immobiliare.it, Idealista.it, Subito.it & Casa.it.'
                : 'Una sola barra per generare subito ricerche dirette su Immobiliare.it, Idealista.it, Subito.it e Casa.it.'}
            </p>
          </div>

          {/* Quick Client Loader */}
          <div className="w-full sm:w-80">
            <label
              htmlFor="quick-client-load"
              className="text-[11px] font-bold uppercase tracking-wider text-[#4f727d] flex items-center gap-1.5 mb-1"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#177858]" aria-hidden="true" />
              <span>{isEn ? 'Load from Client' : 'Carica da Cliente'}</span>
            </label>
            <select
              id="quick-client-load"
              data-testid="quick-client-select"
              value={selectedClientId}
              onChange={(e) => handleSelectClient(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-[#f4faf9] border border-[#cbe2de] rounded-lg text-[#0e4d5f] focus:outline-none focus:ring-2 focus:ring-[#2eb086]"
            >
              <option value="">
                {clients.length === 0
                  ? isEn
                    ? 'No clients saved yet'
                    : 'Nessun cliente salvato'
                  : isEn
                    ? 'Select a client to auto-fill...'
                    : 'Seleziona un cliente per compilare...'}
              </option>
              {clients.map((client) => {
                const roleLabel = translateRole(client.role, lang);
                const zoneText = client.zone || client.address || (isEn ? 'Area N/A' : 'Zona N/D');
                const priceText = client.price > 0 ? formatCurrencyEUR(client.price, lang) : '';
                return (
                  <option key={client.id} value={client.id}>
                    {`[${roleLabel}] ${client.name} — ${translatePropertyType(client.propertyType, lang)} · ${zoneText}${priceText ? ` · ${priceText}` : ''}`}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Single Search Form Row */}
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.2fr)_132px_minmax(0,1.3fr)_138px_auto] gap-2.5 items-end">
            {/* Main Search Input */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label
                htmlFor="portal-main-search"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#4f727d] mb-1"
              >
                {isEn ? 'What are you looking for?' : 'Cosa cerchi?'}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#4f727d] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  id="portal-main-search"
                  data-testid="portal-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isEn
                      ? 'e.g. 3-room Milan Navigli 300000'
                      : 'Es. "Trilocale Milano Navigli 300000"'
                  }
                  className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-[#cbe2de] rounded-lg text-[#0e4d5f] placeholder:text-[#7f9da6] focus:outline-none focus:ring-2 focus:ring-[#2eb086]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label={isEn ? 'Clear search text' : 'Pulisci testo ricerca'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#7f9da6] hover:text-[#0e4d5f]"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter 1: Contract */}
            <div>
              <label
                htmlFor="portal-contract-select"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#4f727d] mb-1"
              >
                {isEn ? 'Contract' : 'Contratto'}
              </label>
              <select
                id="portal-contract-select"
                data-testid="filter-contract"
                value={contract}
                onChange={(e) =>
                  setContract(e.target.value as 'tutti' | 'vendita' | 'affitto')
                }
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#cbe2de] rounded-lg text-[#0e4d5f] focus:outline-none focus:ring-2 focus:ring-[#2eb086]"
              >
                <option value="vendita">{isEn ? 'For Sale' : 'Vendita'}</option>
                <option value="affitto">{isEn ? 'For Rent' : 'Affitto'}</option>
                <option value="tutti">{isEn ? 'All' : 'Tutti'}</option>
              </select>
            </div>

            {/* Filter 2: City / Zone */}
            <div>
              <label
                htmlFor="portal-city-input"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#4f727d] mb-1"
              >
                {isEn ? 'City / Area' : 'Città / Zona'}
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-[#4f727d] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  id="portal-city-input"
                  data-testid="filter-city-zone"
                  type="text"
                  value={cityZone}
                  onChange={(e) => setCityZone(e.target.value)}
                  placeholder={isEn ? 'e.g. Milan Navigli' : 'es. Milano Navigli'}
                  className="w-full pl-8 pr-7 py-2.5 text-sm bg-white border border-[#cbe2de] rounded-lg text-[#0e4d5f] placeholder:text-[#7f9da6] focus:outline-none focus:ring-2 focus:ring-[#2eb086]"
                />
                {cityZone && (
                  <button
                    type="button"
                    onClick={() => setCityZone('')}
                    aria-label={isEn ? 'Clear city' : 'Pulisci città'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[#7f9da6] hover:text-[#0e4d5f]"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter 3: Max Price */}
            <div>
              <label
                htmlFor="portal-max-price"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#4f727d] mb-1"
              >
                {isEn ? 'Max Price €' : 'Prezzo Max (€)'}
              </label>
              <input
                id="portal-max-price"
                data-testid="filter-max-price"
                type="number"
                min={0}
                step={1000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="300000"
                className="w-full px-3 py-2.5 text-sm tabular-nums bg-white border border-[#cbe2de] rounded-lg text-[#0e4d5f] placeholder:text-[#7f9da6] focus:outline-none focus:ring-2 focus:ring-[#2eb086]"
              />
            </div>

            {/* Primary Search CTA */}
            <div className="sm:col-span-2 lg:col-span-1">
              <button
                type="submit"
                data-testid="search-portals-btn"
                className="w-full py-2.5 px-4 bg-[#177858] hover:bg-[#0e4d5f] text-white text-sm font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{isEn ? 'Search 4 Portals' : 'Cerca nei 4 Portali'}</span>
              </button>
            </div>
          </div>

          {selectedClient && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#f4faf9] border border-[#cbe2de] text-xs text-[#0e4d5f]">
              <span className="font-medium">
                {isEn ? 'Active client profile:' : 'Profilo cliente caricato:'}{' '}
                <strong>{selectedClient.name}</strong> ({translateRole(selectedClient.role, lang)})
              </span>
              <button
                type="button"
                onClick={() => setSelectedClientId('')}
                className="text-[#177858] hover:underline font-semibold cursor-pointer"
              >
                {isEn ? 'Clear client' : 'Scollega cliente'}
              </button>
            </div>
          )}
        </form>
      </section>

      {/* Bulk Action + 4 Direct Portal Cards */}
      <section className="space-y-3">
        <div className="bg-white border border-[#cbe2de] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-[#0e4d5f]">
              <Layers className="w-4 h-4 text-[#177858]" aria-hidden="true" />
              <span>
                {isEn
                  ? 'Ready Direct Links on All 4 Portals'
                  : 'Risultati e Link Diretti sui 4 Portali'}
              </span>
            </div>
            <p className="text-xs text-[#4f727d]">
              {builtSummaryQuery ? (
                <>
                  {isEn ? 'Active query:' : 'Ricerca attiva:'}{' '}
                  <strong className="text-[#0e4d5f]">{builtSummaryQuery}</strong>
                </>
              ) : isEn ? (
                'Type keywords or select a client above: links update immediately for all 4 portals.'
              ) : (
                'Scrivi sopra o seleziona un cliente: i collegamenti diretti ai 4 portali si aggiornano subito.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Open Mode Toggle (Tabs vs 2x2 Desktop Grid) */}
            <div className="hidden md:flex bg-[#f4faf9] p-1 rounded-lg border border-[#cbe2de]">
              <button
                type="button"
                onClick={() => setOpenMode('tabs')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                  openMode === 'tabs'
                    ? 'bg-[#0e4d5f] text-white'
                    : 'text-[#4f727d] hover:text-[#0e4d5f]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isEn ? '4 Tabs' : '4 Schede'}</span>
              </button>
              <button
                type="button"
                onClick={() => setOpenMode('grid')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                  openMode === 'grid'
                    ? 'bg-[#0e4d5f] text-white'
                    : 'text-[#4f727d] hover:text-[#0e4d5f]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isEn ? '2x2 Grid' : 'Griglia 2x2'}</span>
              </button>
            </div>

            <button
              type="button"
              data-testid="open-all-portals-btn"
              onClick={handleOpenAllFour}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#0e4d5f] hover:bg-[#177858] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isEn ? 'Open all 4 together' : 'Apri tutti e 4 insieme'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Popup-Blocked Fallback Strip */}
        {blockedFallback.length > 0 && (
          <div
            role="status"
            data-testid="find-popup-fallback"
            className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 text-xs text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-bold">
                    {isEn
                      ? `${blockedFallback.length} tab(s) blocked by browser pop-up blocker`
                      : `Il browser ha bloccato ${blockedFallback.length} schede simultanee (blocco pop-up)`}
                  </div>
                  <p className="text-amber-900 mt-0.5">
                    {isEn
                      ? 'Tap the portal buttons below directly (1 click each) or allow pop-ups for this site:'
                      : 'Clicca direttamente i portali qui sotto per aprirli senza blocchi (oppure consenti i pop-up):'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBlockedFallback([])}
                aria-label={isEn ? 'Dismiss notice' : 'Chiudi avviso'}
                className="p-1 text-amber-700 hover:text-amber-950"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {blockedFallback.map((item) => (
                <a
                  key={`fallback-${item.name}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg bg-[#177858] hover:bg-[#0e4d5f] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isEn ? `Open ${item.name}` : `Apri ${item.name}`}</span>
                </a>
              ))}
              <button
                type="button"
                onClick={handleCopyAllLinks}
                className="px-3 py-2 rounded-lg bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isEn ? 'Copy all 4 links' : 'Copia tutti e 4 i link'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 4 Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portalCards.map(({ portal, host, directUrl, googleUrl, meta }) => (
            <article
              key={portal.id}
              data-testid={`portal-card-${host}`}
              className={`bg-white rounded-xl border p-4 flex flex-col justify-between gap-4 transition-all ${
                highlightCards
                  ? 'border-[#2eb086] ring-2 ring-[#2eb086]/25 shadow-sm'
                  : 'border-[#cbe2de] hover:border-[#2eb086]/70 shadow-xs'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${meta.badgeBg}`}
                    >
                      <Building2 className={`w-4 h-4 ${meta.badgeText}`} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-[#0e4d5f] leading-tight">
                        {portal.name}
                      </h3>
                      <span className="text-[11px] font-medium text-[#4f727d]">{host}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border ${meta.badgeBg} ${meta.badgeText}`}
                  >
                    {formatContractLabel(effectiveContract)}
                  </span>
                </div>

                <p className="text-xs text-[#4f727d]">
                  {isEn ? meta.taglineEn : meta.taglineIt}
                </p>

                {/* Concise Summary Box */}
                <div className="bg-[#f4faf9] border border-[#dceceb] rounded-lg px-3 py-2 text-xs text-[#0e4d5f] space-y-1">
                  <div className="font-semibold truncate">
                    {builtSummaryQuery || (isEn ? 'All listings (portal homepage)' : 'Ricerca libera sul portale')}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#4f727d]">
                    <span>
                      {isEn ? 'Contract:' : 'Contratto:'}{' '}
                      <strong className="text-[#0e4d5f]">{formatContractLabel(effectiveContract)}</strong>
                    </span>
                    {effectiveCity && (
                      <span>
                        {isEn ? 'Area:' : 'Zona:'}{' '}
                        <strong className="text-[#0e4d5f]">{effectiveCity}</strong>
                      </span>
                    )}
                    {formattedBudget && (
                      <span>
                        {isEn ? 'Max:' : 'Budget Max:'}{' '}
                        <strong className="text-[#0e4d5f]">{formattedBudget}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Two Direct Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <a
                  href={directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`open-direct-${host}`}
                  className="py-2.5 px-3 rounded-lg bg-[#177858] hover:bg-[#0e4d5f] text-white text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{isEn ? `Open on ${portal.name}` : `Apri su ${portal.name}`}</span>
                </a>

                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`open-google-${host}`}
                  className="py-2.5 px-3 rounded-lg bg-[#f4faf9] hover:bg-[#e3f3f0] text-[#0e4d5f] border border-[#cbe2de] text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 text-center"
                >
                  <Globe className="w-3.5 h-3.5 text-[#177858] shrink-0" aria-hidden="true" />
                  <span>{isEn ? 'Quick Google Results' : 'Risultati Rapidi Google'}</span>
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#4f727d] px-1">
          <Sparkles className="w-3.5 h-3.5 text-[#177858] shrink-0" aria-hidden="true" />
          <span>
            {isEn
              ? 'Tip: If a portal asks for exact neighborhood disambiguation, use "Quick Google Results" for instant 0-404 indexed listings.'
              : 'Consiglio: usa "Risultati Rapidi Google" per vedere subito gli annunci indicizzati del portale senza mai incontrare errori 404.'}
          </span>
        </div>
      </section>
    </div>
  );
}
