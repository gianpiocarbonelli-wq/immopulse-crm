import type { PortalSearchFilters, PropertyPortalConfig } from '../types/crm';
import type { AppLanguage } from './i18n';

export const DEFAULT_ITALIAN_PORTALS: PropertyPortalConfig[] = [
  {
    id: 'portal-immobiliare',
    name: 'Immobiliare.it',
    url: 'https://www.immobiliare.it',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'portal-idealista',
    name: 'Idealista.it',
    url: 'https://www.idealista.it',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'portal-subito',
    name: 'Subito.it',
    url: 'https://www.subito.it',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'portal-casa',
    name: 'Casa.it',
    url: 'https://www.casa.it',
    enabled: true,
    isCustom: false,
  },
];

export const PRESET_CUSTOM_FEATURES: readonly string[] = [
  'Terrazzo',
  'Giardino',
  'Ascensore',
  'Box / Garage',
  'Arredato',
  'Ristrutturato',
  'Nuova costruzione',
  'Classe A',
  'Vista mare',
  'Climatizzato',
  'Cantina',
  'Piano alto',
];

export const EMPTY_PORTAL_FILTERS: PortalSearchFilters = {
  contract: 'tutti',
  propertyType: 'ALL',
  cityZone: '',
  minPrice: '',
  maxPrice: '',
  minSqm: '',
  minRooms: 'ALL',
  customFeatures: [],
};

export function cloneDefaultPortals(): PropertyPortalConfig[] {
  return DEFAULT_ITALIAN_PORTALS.map((portal) => ({ ...portal }));
}

export function normalizePortalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (!host || !host.includes('.') || host.startsWith('.') || host.endsWith('.')) {
      return null;
    }
    const cleanPath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/g, '');
    return `${parsed.protocol}//${parsed.host}${cleanPath}${parsed.search}`;
  } catch {
    return null;
  }
}

export function extractPortalHostname(url: string): string {
  const normalized = normalizePortalUrl(url);
  if (!normalized) return '';
  try {
    return new URL(normalized).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function derivePortalName(
  url: string,
  explicitName?: string,
  lang: AppLanguage = 'it',
): string {
  const trimmedName = explicitName?.trim();
  if (trimmedName) return trimmedName;

  const host = extractPortalHostname(url);
  if (!host) return lang === 'en' ? 'Real Estate Portal' : 'Portale Immobiliare';
  return host.charAt(0).toUpperCase() + host.slice(1);
}

export function updatePortalInList(
  portals: PropertyPortalConfig[],
  portalId: string,
  urlInput: string,
  nameInput?: string,
  lang: AppLanguage = 'it',
): { portals: PropertyPortalConfig[]; error?: string; updated?: PropertyPortalConfig } {
  const normalizedUrl = normalizePortalUrl(urlInput);
  if (!normalizedUrl) {
    return {
      portals,
      error:
        lang === 'en'
          ? 'Enter a valid portal link (e.g. https://www.immobiliare.it).'
          : 'Inserisci un link valido per il portale (es. https://www.immobiliare.it).',
    };
  }

  const nextUpdated: PropertyPortalConfig = {
    id: portalId,
    name: derivePortalName(normalizedUrl, nameInput, lang),
    url: normalizedUrl,
    enabled: true,
    isCustom: true,
  };

  return {
    portals: portals.map((p) => (p.id === portalId ? { ...p, ...nextUpdated, enabled: p.enabled } : p)),
    updated: nextUpdated,
  };
}

export function addPortalToList(
  portals: PropertyPortalConfig[],
  urlInput: string,
  nameInput?: string,
  lang: AppLanguage = 'it',
): { portals: PropertyPortalConfig[]; error?: string; added?: PropertyPortalConfig } {
  const normalizedUrl = normalizePortalUrl(urlInput);
  if (!normalizedUrl) {
    return {
      portals,
      error:
        lang === 'en'
          ? 'Enter a valid portal URL (e.g. https://www.tecnocasa.it).'
          : 'Inserisci un URL valido per il portale (es. https://www.tecnocasa.it).',
    };
  }

  const hostname = extractPortalHostname(normalizedUrl);
  const exists = portals.some(
    (p) =>
      extractPortalHostname(p.url) === hostname &&
      normalizePortalUrl(p.url) === normalizedUrl,
  );
  if (exists) {
    return {
      portals,
      error:
        lang === 'en'
          ? `Portal ${hostname} is already in the list.`
          : `Il portale ${hostname} è già presente nella lista.`,
    };
  }

  const newPortal: PropertyPortalConfig = {
    id: `portal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: derivePortalName(normalizedUrl, nameInput, lang),
    url: normalizedUrl,
    enabled: true,
    isCustom: true,
  };

  return {
    portals: [...portals, newPortal],
    added: newPortal,
  };
}

export function removePortalFromList(
  portals: PropertyPortalConfig[],
  portalId: string,
): PropertyPortalConfig[] {
  return portals.filter((p) => p.id !== portalId);
}

export function togglePortalEnabled(
  portals: PropertyPortalConfig[],
  portalId: string,
): PropertyPortalConfig[] {
  return portals.map((p) => (p.id === portalId ? { ...p, enabled: !p.enabled } : p));
}

export function sanitizePortalsList(raw: unknown): PropertyPortalConfig[] {
  if (!Array.isArray(raw)) return cloneDefaultPortals();
  const valid: PropertyPortalConfig[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Partial<PropertyPortalConfig>;
    if (typeof obj.url !== 'string') continue;
    const normalizedUrl = normalizePortalUrl(obj.url);
    if (!normalizedUrl) continue;
    valid.push({
      id:
        typeof obj.id === 'string' && obj.id.trim()
          ? obj.id.trim()
          : `portal-${valid.length}-${extractPortalHostname(normalizedUrl)}`,
      name: derivePortalName(normalizedUrl, typeof obj.name === 'string' ? obj.name : undefined),
      url: normalizedUrl,
      enabled: typeof obj.enabled === 'boolean' ? obj.enabled : true,
      isCustom: Boolean(obj.isCustom),
    });
  }
  return valid.length > 0 ? valid : cloneDefaultPortals();
}

export function normalizeCustomFeatures(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const cleaned = item.trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= 24) break;
  }
  return result;
}

export function toggleCustomFeature(current: string[], feature: string): string[] {
  const cleaned = feature.trim().replace(/\s+/g, ' ');
  if (!cleaned) return current;
  const targetKey = cleaned.toLowerCase();
  const exists = current.some((f) => f.toLowerCase() === targetKey);
  if (exists) {
    return current.filter((f) => f.toLowerCase() !== targetKey);
  }
  return normalizeCustomFeatures([...current, cleaned]);
}

export function addCustomFeatureLabel(
  current: string[],
  rawInput: string,
): { next: string[]; added?: string } {
  const cleaned = rawInput.trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!cleaned) return { next: current };
  const targetKey = cleaned.toLowerCase();
  if (current.some((f) => f.toLowerCase() === targetKey)) {
    return { next: current };
  }
  return {
    next: normalizeCustomFeatures([...current, cleaned]),
    added: cleaned,
  };
}

export function hasActivePortalFilters(filters: Partial<PortalSearchFilters> | undefined): boolean {
  if (!filters) return false;
  return Boolean(
    (filters.contract && filters.contract !== 'tutti') ||
      (filters.propertyType && filters.propertyType !== 'ALL') ||
      filters.cityZone?.trim() ||
      filters.minPrice?.trim() ||
      filters.maxPrice?.trim() ||
      filters.minSqm?.trim() ||
      (filters.minRooms && filters.minRooms !== 'ALL') ||
      (Array.isArray(filters.customFeatures) && filters.customFeatures.length > 0),
  );
}

export function buildSearchQueryWithFilters(
  query: string,
  filters?: Partial<PortalSearchFilters>,
): string {
  const parts: string[] = [];
  if (query.trim()) parts.push(query.trim());
  if (filters?.contract && filters.contract !== 'tutti') {
    parts.push(filters.contract === 'vendita' ? 'in vendita' : 'in affitto');
  }
  if (filters?.propertyType && filters.propertyType !== 'ALL') {
    parts.push(filters.propertyType);
  }
  if (filters?.cityZone?.trim()) {
    parts.push(filters.cityZone.trim());
  }
  if (filters?.minRooms && filters.minRooms !== 'ALL') {
    parts.push(`${filters.minRooms}+ locali`);
  }
  if (filters?.minSqm?.trim()) {
    parts.push(`da ${filters.minSqm.trim()} mq`);
  }
  if (filters?.minPrice?.trim() && filters?.maxPrice?.trim()) {
    parts.push(`prezzo da ${filters.minPrice.trim()} a ${filters.maxPrice.trim()} euro`);
  } else if (filters?.minPrice?.trim()) {
    parts.push(`da ${filters.minPrice.trim()} euro`);
  } else if (filters?.maxPrice?.trim()) {
    parts.push(`fino a ${filters.maxPrice.trim()} euro`);
  }
  const features = normalizeCustomFeatures(filters?.customFeatures);
  if (features.length > 0) {
    parts.push(features.join(' '));
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function buildPortalVerificationUrl(
  portal: PropertyPortalConfig,
  query: string,
  filters?: Partial<PortalSearchFilters>,
): string {
  const fullQuery = buildSearchQueryWithFilters(query, filters);
  const host = extractPortalHostname(portal.url);
  if (!fullQuery) {
    return portal.url;
  }

  // Native deep search URL for Subito.it supports direct keyword + contract category paths
  if (host === 'subito.it') {
    const params = new URLSearchParams({ q: fullQuery });
    const contractPath =
      filters?.contract === 'affitto'
        ? 'affitto/immobili'
        : filters?.contract === 'vendita'
          ? 'vendita/immobili'
          : 'immobili';
    return `https://www.subito.it/annunci-italia/${contractPath}/?${params.toString()}`;
  }

  if (!host) {
    return `https://www.google.com/search?q=${encodeURIComponent(fullQuery)}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(`site:${host} ${fullQuery}`)}`;
}

export interface SimplePortalSearchInput {
  query: string;
  contract: 'tutti' | 'vendita' | 'affitto';
  cityZone: string;
  maxPrice: string;
}

function normalizePriceDigits(raw: string): string {
  return String(raw ?? '').replace(/[^0-9]/g, '');
}

export function normalizeCitySlug(raw: string): string {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractExtraKeywords(input: SimplePortalSearchInput): string {
  let text = input.query.trim();
  if (!text) return '';

  const city = input.cityZone.trim();
  if (city) {
    text = text.replace(new RegExp(`\\b${escapeRegExp(city)}\\b`, 'gi'), ' ');
  }
  if (input.contract === 'vendita') {
    text = text.replace(/\bvendita\b/gi, ' ');
  } else if (input.contract === 'affitto') {
    text = text.replace(/\baffitto\b/gi, ' ');
  }
  const maxDigits = normalizePriceDigits(input.maxPrice);
  if (maxDigits) {
    text = text.replace(new RegExp(`\\b${escapeRegExp(maxDigits)}\\b`, 'g'), ' ');
  }

  return text.replace(/\s+/g, ' ').trim();
}

export function buildSimplePortalQuery(input: SimplePortalSearchInput): string {
  const parts: string[] = [];
  const contractWord =
    input.contract === 'vendita' ? 'vendita' : input.contract === 'affitto' ? 'affitto' : '';
  const city = input.cityZone.trim();
  const extraKeywords = extractExtraKeywords(input);
  const maxDigits = normalizePriceDigits(input.maxPrice);

  if (contractWord) parts.push(contractWord);
  if (city) parts.push(city);
  if (extraKeywords) parts.push(extraKeywords);
  if (maxDigits) parts.push(`fino a ${maxDigits} euro`);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export const ITALIAN_PROVINCE_CAPITALS: ReadonlySet<string> = new Set([
  'milano',
  'roma',
  'torino',
  'napoli',
  'bologna',
  'firenze',
  'genova',
  'bari',
  'palermo',
  'catania',
  'venezia',
  'verona',
  'padova',
  'brescia',
  'bergamo',
  'monza',
  'como',
  'varese',
  'pavia',
  'lecco',
  'lodi',
  'cremona',
  'mantova',
  'sondrio',
  'trento',
  'bolzano',
  'trieste',
  'udine',
  'pordenone',
  'gorizia',
  'aosta',
  'biella',
  'vercelli',
  'novara',
  'verbania',
  'cuneo',
  'asti',
  'alessandria',
  'savona',
  'imperia',
  'la-spezia',
  'vicenza',
  'treviso',
  'belluno',
  'rovigo',
  'piacenza',
  'parma',
  'reggio-emilia',
  'modena',
  'ferrara',
  'ravenna',
  'forli',
  'cesena',
  'rimini',
  'massa',
  'carrara',
  'lucca',
  'pistoia',
  'prato',
  'pisa',
  'livorno',
  'arezzo',
  'siena',
  'grosseto',
  'perugia',
  'terni',
  'pesaro',
  'urbino',
  'ancona',
  'macerata',
  'fermo',
  'ascoli-piceno',
  'viterbo',
  'rieti',
  'latina',
  'frosinone',
  'l-aquila',
  'laquila',
  'teramo',
  'pescara',
  'chieti',
  'campobasso',
  'isernia',
  'caserta',
  'benevento',
  'avellino',
  'salerno',
  'foggia',
  'barletta',
  'andria',
  'trani',
  'taranto',
  'brindisi',
  'lecce',
  'potenza',
  'matera',
  'cosenza',
  'crotone',
  'catanzaro',
  'vibo-valentia',
  'reggio-calabria',
  'trapani',
  'agrigento',
  'caltanissetta',
  'enna',
  'messina',
  'ragusa',
  'siracusa',
  'cagliari',
  'sassari',
  'nuoro',
  'oristano',
]);

export function buildIdealistaDirectUrl(input: SimplePortalSearchInput): string {
  const resolved = resolveSimplePortalSearchInput(input);
  const citySlug = resolvePortalCitySlug(resolved.cityZone);
  if (!citySlug) {
    return 'https://www.idealista.it/';
  }
  const contractPath = resolved.contract === 'affitto' ? 'affitto-case' : 'vendita-case';
  const areaSlug = ITALIAN_PROVINCE_CAPITALS.has(citySlug) ? `${citySlug}-provincia` : citySlug;
  const maxDigits = normalizePriceDigits(resolved.maxPrice);
  const priceSegment =
    maxDigits && Number(maxDigits) > 0 ? `con-prezzo_${maxDigits}/` : '';
  return `https://www.idealista.it/${contractPath}/${areaSlug}/${priceSegment}`;
}

export const buildIdealistaProvinciaUrl = buildIdealistaDirectUrl;

const COMMON_EXTRA_MUNICIPALITIES: ReadonlySet<string> = new Set([
  'sesto-san-giovanni',
  'cinisello-balsamo',
  'cologno-monzese',
  'san-donato-milanese',
  'san-giuliano-milanese',
  'segrate',
  'corsico',
  'rho',
  'legnano',
  'busto-arsizio',
  'gallarate',
  'seregno',
  'lissone',
  'desio',
  'brugherio',
  'vimercate',
  'abbiategrasso',
  'magenta',
  'rozano',
  'rozzano',
  'bollate',
  'paderno-dugnano',
  'cormano',
  'garbagnate-milanese',
  'pioltello',
  'cernusco-sul-naviglio',
  'melzo',
  'gorgonzola',
  'moncalieri',
  'rivoli',
  'collegno',
  'settimo-torinese',
  'nichelino',
  'chieri',
  'fiumicino',
  'guidonia',
  'tivoli',
  'pomezia',
  'anzio',
  'nettuno',
  'frascati',
  'velletri',
  'civitavecchia',
  'giugliano',
  'casoria',
  'portici',
  'ercolano',
  'castellammare-di-stabia',
  'pozzuoli',
  'torre-del-greco',
  'imola',
  'faenza',
  'carpi',
  'sassuolo',
  'san-lazzaro-di-savena',
  'casalecchio-di-reno',
  'mestre',
  'chioggia',
  'jesolo',
  'bassano-del-grappa',
  'castelfranco-veneto',
  'conegliano',
  'viareggio',
  'empole',
  'empoli',
  'sanremo',
  'ventimiglia',
  'rapallo',
  'chiavari',
  'rovereto',
  'merano',
  'bressanone',
  'cortina-d-ampezzo',
  'alghero',
  'olbia',
  'quartu-sant-elena',
  'taormina',
  'sorrento',
  'positano',
  'amalfi',
  'riccione',
  'cattolica',
  'cervia',
  'fano',
  'senigallia',
  'civitanova-marche',
  'san-benedetto-del-tronto',
  'vieste',
  'gallipoli',
  'ostuni',
  'polignano-a-mare',
  'monopoli',
]);

function findKnownCityInSlugTokens(slug: string): string {
  if (!slug) return '';
  if (ITALIAN_PROVINCE_CAPITALS.has(slug) || COMMON_EXTRA_MUNICIPALITIES.has(slug)) {
    return slug;
  }

  const tokens = slug.split('-').filter(Boolean);
  // Check 3-token, 2-token, then 1-token matches against known municipalities/capitals
  for (const len of [3, 2, 1]) {
    if (tokens.length < len) continue;
    for (let i = 0; i <= tokens.length - len; i += 1) {
      const candidate = tokens.slice(i, i + len).join('-');
      if (ITALIAN_PROVINCE_CAPITALS.has(candidate) || COMMON_EXTRA_MUNICIPALITIES.has(candidate)) {
        return candidate;
      }
    }
  }
  return '';
}

export function resolvePortalCitySlug(rawCityZone: string): string {
  const trimmed = String(rawCityZone ?? '').trim();
  if (!trimmed) return '';

  // Handle "Via Roma 1, Milano" or "Centro Storico — Milano" -> check segments right-to-left
  if (/[,\-–—]/.test(trimmed)) {
    const segments = trimmed
      .split(/[,\–—]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i -= 1) {
      const segSlug = normalizeCitySlug(segments[i]);
      const matched = findKnownCityInSlugTokens(segSlug);
      if (matched) return matched;
    }
  }

  const fullSlug = normalizeCitySlug(trimmed);
  if (ITALIAN_PROVINCE_CAPITALS.has(fullSlug) || COMMON_EXTRA_MUNICIPALITIES.has(fullSlug)) {
    return fullSlug;
  }

  // If "Milano Navigli" or "Roma Prati" is entered in Città/Zona, extract canonical city slug
  const tokens = fullSlug.split('-').filter(Boolean);
  if (tokens.length >= 2) {
    const known = findKnownCityInSlugTokens(fullSlug);
    if (known) return known;
  }

  return fullSlug;
}

export function extractCityHintFromQuery(query: string): string {
  const cleaned = String(query ?? '').trim();
  if (!cleaned) return '';

  // Split words cleanly, preserving capitalized city preference if present
  const normalizedSlug = normalizeCitySlug(cleaned);
  const matchedSlug = findKnownCityInSlugTokens(normalizedSlug);
  if (!matchedSlug) return '';

  return matchedSlug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function extractMaxPriceHintFromQuery(query: string): string {
  const text = String(query ?? '').trim();
  if (!text) return '';

  // Match standalone numbers >= 100 (e.g. 300000, 1100, 250.000), skipping sqm numbers like "90 mq" / "90m2"
  const sanitized = text.replace(/\b\d+\s*(?:mq|m2|m²|locali|vani)\b/gi, ' ');
  const matches = sanitized.match(/\b\d{3,8}(?:[.,]\d{3})?\b/g);
  if (!matches || matches.length === 0) return '';

  const digits = matches[matches.length - 1].replace(/[^0-9]/g, '');
  if (!digits || Number(digits) < 100) return '';
  return digits;
}

export function extractClientCityAndZone(zone: string, address: string): {
  cityZone: string;
  neighborhoodNote: string;
} {
  const cleanZone = String(zone ?? '').trim();
  const cleanAddress = String(address ?? '').trim();

  // Prefer extracting the real city from address (e.g. "Via Roma 1, Milano") when zone is a neighborhood ("Centro Storico")
  if (cleanAddress) {
    const addressCity = resolvePortalCitySlug(cleanAddress);
    if (addressCity && (ITALIAN_PROVINCE_CAPITALS.has(addressCity) || COMMON_EXTRA_MUNICIPALITIES.has(addressCity))) {
      const displayCity = addressCity
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      const zoneSlug = normalizeCitySlug(cleanZone);
      const neighborhoodNote =
        cleanZone && zoneSlug !== addressCity ? cleanZone : '';
      return {
        cityZone: neighborhoodNote ? `${displayCity} ${neighborhoodNote}` : displayCity,
        neighborhoodNote,
      };
    }
  }

  return {
    cityZone: cleanZone || cleanAddress,
    neighborhoodNote: '',
  };
}

export function resolveSimplePortalSearchInput(
  input: SimplePortalSearchInput,
): SimplePortalSearchInput {
  const trimmedCity = input.cityZone.trim();
  const trimmedPrice = normalizePriceDigits(input.maxPrice);

  let resolvedContract = input.contract;
  if (resolvedContract === 'vendita' && /\baffitto\b/i.test(input.query) && !/\bvendita\b/i.test(input.query)) {
    resolvedContract = 'affitto';
  }

  const resolvedCity = trimmedCity || extractCityHintFromQuery(input.query);
  const resolvedPrice = trimmedPrice || extractMaxPriceHintFromQuery(input.query);

  return {
    query: input.query,
    contract: resolvedContract,
    cityZone: resolvedCity,
    maxPrice: resolvedPrice,
  };
}

export function buildDirectPortalSearchUrl(
  portal: PropertyPortalConfig,
  input: SimplePortalSearchInput,
): string {
  const resolved = resolveSimplePortalSearchInput(input);
  const host = extractPortalHostname(portal.url);
  const citySlug = resolvePortalCitySlug(resolved.cityZone);
  const maxDigits = normalizePriceDigits(resolved.maxPrice);

  if (host === 'immobiliare.it') {
    if (!citySlug) {
      return 'https://www.immobiliare.it/';
    }
    const contractPath = resolved.contract === 'affitto' ? 'affitto-case' : 'vendita-case';
    const base = `https://www.immobiliare.it/${contractPath}/${citySlug}/`;
    if (maxDigits) {
      return `${base}?prezzoMassimo=${encodeURIComponent(maxDigits)}`;
    }
    return base;
  }

  if (host === 'idealista.it') {
    return buildIdealistaDirectUrl(resolved);
  }

  if (host === 'subito.it') {
    const contractPath =
      resolved.contract === 'affitto'
        ? 'affitto/immobili'
        : resolved.contract === 'vendita'
          ? 'vendita/immobili'
          : 'immobili';
    const extra = extractExtraKeywords(resolved);
    const queryTerms = [resolved.cityZone.trim(), extra]
      .filter(Boolean)
      .join(' ')
      .trim();
    const params = new URLSearchParams();
    if (queryTerms) {
      params.set('q', queryTerms);
    }
    if (maxDigits) {
      params.set('pe', maxDigits);
    }
    const qs = params.toString();
    return `https://www.subito.it/annunci-italia/${contractPath}/${qs ? `?${qs}` : ''}`;
  }

  if (host === 'casa.it') {
    const contractPath =
      resolved.contract === 'affitto' ? 'affitto/residenziale' : 'vendita/residenziale';
    if (!citySlug) {
      return `https://www.casa.it/${contractPath}/`;
    }
    const base = `https://www.casa.it/${contractPath}/${citySlug}/`;
    if (maxDigits) {
      return `${base}?prezzoMax=${encodeURIComponent(maxDigits)}`;
    }
    return base;
  }

  return buildGooglePortalQuickSearchUrl(portal, resolved);
}

export function buildGooglePortalQuickSearchUrl(
  portal: PropertyPortalConfig,
  input: SimplePortalSearchInput,
): string {
  const resolved = resolveSimplePortalSearchInput(input);
  const host = extractPortalHostname(portal.url);
  const fullQuery = buildSimplePortalQuery(resolved);
  if (!host) {
    return `https://www.google.com/search?q=${encodeURIComponent(fullQuery || 'immobili')}`;
  }
  const searchTerms = fullQuery ? `site:${host} ${fullQuery}` : `site:${host}`;
  return `https://www.google.com/search?q=${encodeURIComponent(searchTerms)}`;
}


