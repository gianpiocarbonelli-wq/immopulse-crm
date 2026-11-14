import type {
  ClientFilters,
  ClientInteraction,
  ClientRecord,
  ClientRole,
  ClientStatus,
  CrmMetrics,
  InteractionType,
  MatchResult,
  PlanTier,
  UpcomingDayBucket,
  UserAccount,
} from '../types/crm';

export const MAX_PHOTOS_PER_CLIENT = 7;
export const MAX_TAGS_PER_CLIENT = 12;

export const SUGGESTED_CLIENT_TAGS: readonly string[] = [
  'investimento',
  'vista mare',
  'ristrutturato',
  'terrazzo',
  'luminoso',
  'prima casa',
  'giardino',
  'nuova costruzione',
];

export const VALID_ROLES: readonly ClientRole[] = ['Acquirente', 'Venditore', 'Inquilino', 'Locatore'];
export const VALID_STATUSES: readonly ClientStatus[] = ['In corso', 'Trattativa', 'Accettato', 'Perso'];
export const VALID_INTERACTION_TYPES: readonly InteractionType[] = [
  'Chiamata',
  'Visita',
  'WhatsApp',
  'Email',
  'Nota',
];
export const PROPERTY_TYPES: readonly string[] = [
  'Appartamento',
  'Attico',
  'Villa',
  'Locale Commerciale',
  'Terreno',
  'Box',
];

export function encodeArg(value: unknown): string {
  return encodeURIComponent(String(value ?? '')).replace(/[!'()*]/g, (ch) =>
    '%' + ch.charCodeAt(0).toString(16).toUpperCase(),
  );
}

export function localDateTimeValue(date: Date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function isValidImageDataUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)
  );
}

export function isValidClient(candidate: unknown): candidate is ClientRecord {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return false;
  }
  const c = candidate as Record<string, unknown>;
  const hasValidId =
    (typeof c.id === 'string' && c.id.trim() !== '') ||
    (typeof c.id === 'number' && Number.isFinite(c.id));
  const hasValidRole = typeof c.role === 'string' && (VALID_ROLES as readonly string[]).includes(c.role);
  const hasValidStatus =
    typeof c.status === 'string' && (VALID_STATUSES as readonly string[]).includes(c.status);
  const validSinglePhoto = c.photoBase64 == null || c.photoBase64 === '' || isValidImageDataUrl(c.photoBase64);
  const validPhotosArray =
    c.photos == null ||
    (Array.isArray(c.photos) &&
      c.photos.length <= MAX_PHOTOS_PER_CLIENT &&
      c.photos.every((s) => s === '' || isValidImageDataUrl(s)));
  const validTagsArray =
    c.tags == null || (Array.isArray(c.tags) && c.tags.every((t) => typeof t === 'string'));
  const validHistoryArray =
    c.history == null ||
    (Array.isArray(c.history) &&
      c.history.every(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          !Array.isArray(entry) &&
          typeof (entry as Record<string, unknown>).date === 'string' &&
          typeof (entry as Record<string, unknown>).type === 'string' &&
          ((entry as Record<string, unknown>).note == null ||
            typeof (entry as Record<string, unknown>).note === 'string'),
      ));

  return (
    hasValidId &&
    typeof c.name === 'string' &&
    c.name.trim() !== '' &&
    typeof c.phone === 'string' &&
    hasValidRole &&
    hasValidStatus &&
    validSinglePhoto &&
    validPhotosArray &&
    validTagsArray &&
    validHistoryArray
  );
}

export function getClientPhotos(client: Pick<ClientRecord, 'photos' | 'photoBase64'> | null | undefined): string[] {
  if (!client) return [];
  if (Array.isArray(client.photos) && client.photos.length > 0) {
    return client.photos.filter(isValidImageDataUrl).slice(0, MAX_PHOTOS_PER_CLIENT);
  }
  if (client.photoBase64 && isValidImageDataUrl(client.photoBase64)) {
    return [client.photoBase64];
  }
  return [];
}

export function getClientNote(
  client: { note?: unknown; notes?: unknown } | null | undefined,
): string {
  if (!client) return '';
  if (typeof client.note === 'string' && client.note.trim() !== '') {
    return client.note.trim();
  }
  if (typeof client.notes === 'string') {
    return client.notes.trim();
  }
  return '';
}

export function normalizeTags(rawTags: unknown): string[] {
  if (!Array.isArray(rawTags)) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of rawTags) {
    if (typeof item !== 'string') continue;
    const cleaned = item.trim().replace(/\s+/g, ' ').slice(0, 32);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= MAX_TAGS_PER_CLIENT) break;
  }

  return result;
}

export function parseTagsInput(input: string): string[] {
  if (!input || typeof input !== 'string') return [];
  return normalizeTags(input.split(/[,;\n]+/));
}

export function addTagToList(currentTags: string[], rawInput: string): string[] {
  const incoming = parseTagsInput(rawInput);
  if (incoming.length === 0) return currentTags;
  return normalizeTags([...currentTags, ...incoming]);
}

export function removeTagFromList(currentTags: string[], tagToRemove: string): string[] {
  const targetKey = tagToRemove.trim().toLowerCase();
  return currentTags.filter((tag) => tag.trim().toLowerCase() !== targetKey);
}

export function getAvailableTags(pool: ClientRecord[]): string[] {
  const seen = new Map<string, string>();
  for (const client of pool) {
    for (const tag of normalizeTags(client.tags)) {
      const key = tag.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, tag);
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, 'it'));
}

export function normalizeHistory(rawHistory: unknown): ClientInteraction[] {
  if (!Array.isArray(rawHistory)) return [];
  const entries: ClientInteraction[] = [];

  for (let i = 0; i < rawHistory.length; i++) {
    const item = rawHistory[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const date = typeof rec.date === 'string' ? rec.date.trim() : '';
    const note = typeof rec.note === 'string' ? rec.note.trim() : '';
    if (!date && !note) continue;

    const rawType = typeof rec.type === 'string' ? rec.type.trim() : 'Nota';
    const type: InteractionType = (VALID_INTERACTION_TYPES as readonly string[]).includes(rawType)
      ? (rawType as InteractionType)
      : 'Nota';

    const id =
      typeof rec.id === 'string' && rec.id.trim() !== ''
        ? rec.id.trim()
        : `hist-${i}-${date || 'undated'}`;

    entries.push({ id, date, type, note });
  }

  return entries.sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : NaN;
    const tb = b.date ? new Date(b.date).getTime() : NaN;
    const validA = !Number.isNaN(ta);
    const validB = !Number.isNaN(tb);
    if (validA && validB) return tb - ta;
    if (validB) return 1;
    if (validA) return -1;
    return 0;
  });
}

export function getLatestInteraction(
  client: { history?: unknown } | null | undefined,
): ClientInteraction | null {
  if (!client) return null;
  const list = normalizeHistory(client.history);
  return list.length > 0 ? list[0] : null;
}

export function formatInteractionDate(dateStr: string): string {
  if (!dateStr) return 'Data non indicata';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  const hasTime = dateStr.includes('T');
  return hasTime
    ? parsed.toLocaleString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : parsed.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

export function normalizeClientRecord(
  raw: Partial<ClientRecord> & Pick<ClientRecord, 'id' | 'name' | 'phone' | 'role' | 'status'>,
): ClientRecord {
  const photos = getClientPhotos({
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    photoBase64: typeof raw.photoBase64 === 'string' ? raw.photoBase64 : '',
  });
  const toNonNegativeNumber = (val: unknown): number => {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const noteText = getClientNote(raw);
  return {
    id: String(raw.id),
    name: String(raw.name || '').trim(),
    phone: String(raw.phone || '').trim(),
    email: typeof raw.email === 'string' ? raw.email.trim() : '',
    role: raw.role,
    propertyType:
      typeof raw.propertyType === 'string' && raw.propertyType.trim()
        ? raw.propertyType.trim()
        : 'Appartamento',
    zone: typeof raw.zone === 'string' ? raw.zone.trim() : '',
    address: typeof raw.address === 'string' ? raw.address.trim() : '',
    price: toNonNegativeNumber(raw.price),
    sqm: toNonNegativeNumber(raw.sqm),
    rooms: typeof raw.rooms === 'string' ? raw.rooms.trim() : '',
    floor: typeof raw.floor === 'string' ? raw.floor.trim() : '',
    condoFees: toNonNegativeNumber(raw.condoFees),
    hasElevator: Boolean(raw.hasElevator),
    hasBalcony: Boolean(raw.hasBalcony),
    hasGarage: Boolean(raw.hasGarage),
    status: raw.status,
    reminderDate: typeof raw.reminderDate === 'string' ? raw.reminderDate : '',
    note: noteText,
    notes: noteText,
    tags: normalizeTags(raw.tags),
    history: normalizeHistory(raw.history),
    photoBase64: photos[0] || '',
    photos,
    isFavorite: Boolean(raw.isFavorite),
  };
}

export function toggleClientFavorite(pool: ClientRecord[], id: string): ClientRecord[] {
  return pool.map((c) =>
    String(c.id) === String(id) ? { ...c, isFavorite: !Boolean(c.isFavorite) } : c,
  );
}

export function getActivePlan(user: UserAccount | null): PlanTier {
  if (!user) return 'free';
  if (user.plan === 'agency') return 'agency';
  if (user.plan === 'full') return 'full';
  if (user.plan === 'basic') return 'basic';
  return 'free';
}

export function getClientLimit(plan: PlanTier): number {
  if (plan === 'agency' || plan === 'full') return Infinity;
  if (plan === 'basic') return 10;
  return 3;
}

export function canUseWhatsAppAndMap(plan: PlanTier): boolean {
  return plan === 'basic' || plan === 'full' || plan === 'agency';
}

export function canUseAgencySync(plan: PlanTier): boolean {
  return plan === 'agency';
}

export function normalizeAgencyCode(raw: string): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function generateAgencyCode(agencyName: string = ''): string {
  const prefix = normalizeAgencyCode(agencyName).slice(0, 12).replace(/-+$/g, '') || 'IMMOPULSE';
  const suffix = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, '7');
  return `${prefix}-${suffix}`;
}

export function detectDeviceLabel(userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): string {
  const ua = userAgent.toLowerCase();
  const os = /iphone|ipad|ipod/.test(ua)
    ? 'iOS'
    : /android/.test(ua)
      ? 'Android'
      : /mac os x/.test(ua)
        ? 'Mac'
        : /windows/.test(ua)
          ? 'Windows'
          : 'Desktop';
  const browser = /edg\//.test(ua)
    ? 'Edge'
    : /firefox\//.test(ua)
      ? 'Firefox'
      : /chrome|chromium/.test(ua)
        ? 'Chrome'
        : /safari/.test(ua)
          ? 'Safari'
          : 'Browser';
  return `${os} · ${browser}`;
}

export function applyUpsertClientSync(pool: ClientRecord[], incoming: ClientRecord): ClientRecord[] {
  const normalized = normalizeClientRecord(incoming);
  const exists = pool.some((c) => String(c.id) === String(normalized.id));
  if (exists) {
    return pool.map((c) => (String(c.id) === String(normalized.id) ? normalized : c));
  }
  return [normalized, ...pool];
}

export function applyDeleteClientSync(pool: ClientRecord[], clientId: string): ClientRecord[] {
  const targetId = String(clientId);
  if (!pool.some((c) => String(c.id) === targetId)) return pool;
  return pool.filter((c) => String(c.id) !== targetId);
}

export function getVisibleClientsPool(clients: ClientRecord[], plan: PlanTier): ClientRecord[] {
  const limit = getClientLimit(plan);
  return Number.isFinite(limit) ? clients.slice(0, limit) : clients;
}

export function generateDemoClients(count: number = 50, referenceNowMs: number = Date.now()): ClientRecord[] {
  const names = [
    'Marco Rossi', 'Luca Bianchi', 'Giulia Verdi', 'Alessandro Romano', 'Francesca Colombo',
    'Matteo Ricci', 'Elena Marino', 'Davide Greco', 'Chiara Bruno', 'Federico Gallo',
    'Sara Conti', 'Andrea De Luca', 'Valentina Costa', 'Stefano Giordano', 'Silvia Mancini',
    'Raffaele Rizzo', 'Martina Lombardi', 'Lorenzo Moretti', 'Alice Barbieri', 'Gabriele Fontanini',
    'Roberta Santoro', 'Emanuele Marini', 'Eleonora Serra', 'Simone Farina', 'Beatrice Monti',
    'Filippo Cattaneo', 'Giorgia Riva', 'Massimo Villa', 'Camilla Brambilla', 'Pietro Galli',
    'Veronika Sala', 'Claudio Parisi', 'Monica Bernardi', 'Daniele Longo', 'Sonia Martinelli',
    'Enrico Gatti', 'Serena Vitale', "Antonio D'Amico", 'Paola Carbone', 'Valerio Rinaldi',
    'Tiziana Izzo', 'Fabio Pagani', 'Carla Neri', 'Gianluca Fontana', 'Sabrina Testa',
    'Giacomo Rota', 'Elisa Borghi', 'Roberto Grassi', 'Laura Santini', 'Vincenzo Ferrara',
  ];

  const roles: ClientRole[] = ['Acquirente', 'Venditore', 'Inquilino', 'Locatore'];
  const propertyTypes = ['Appartamento', 'Attico', 'Villa', 'Locale Commerciale', 'Box', 'Terreno'];
  const zones = [
    'Centro Storico', 'Navigli', 'Brera', 'Monza Centro', 'Isola',
    'San Siro', 'Porta Nuova', 'Sempione', 'Città Studi', 'Bicocca',
  ];
  const streets = ['Roma', 'Dante', 'Garibaldi', 'Manzoni', 'Verdi'];
  const statuses: ClientStatus[] = ['In corso', 'Trattativa', 'Accettato', 'Perso'];

  const total = Math.max(0, Math.min(count, names.length));
  const demoList: ClientRecord[] = [];

  for (let i = 0; i < total; i++) {
    const role = roles[i % roles.length];
    const status = statuses[i % statuses.length];
    const zone = i < 2 ? 'Centro Storico' : zones[i % zones.length];
    const propertyType = i < 2 ? 'Appartamento' : propertyTypes[i % propertyTypes.length];
    const isRental = role === 'Inquilino' || role === 'Locatore';

    const price =
      i === 0
        ? 320000
        : i === 1
          ? 295000
          : isRental
            ? ((i % 15) + 7) * 100
            : ((i % 45) + 14) * 10000;

    const sqm = propertyType === 'Box' ? 14 + (i % 14) : 45 + ((i * 7) % 110);

    let reminderDate = '';
    if (i % 3 === 0) {
      const offsetHours = (i % 2 === 0 ? -1 : 1) * ((i % 7) + 1);
      reminderDate = localDateTimeValue(new Date(referenceNowMs + offsetHours * 3600000));
    } else if (i % 3 === 1) {
      reminderDate = localDateTimeValue(new Date(referenceNowMs + (i + 1) * 12 * 3600000));
    }

    const phoneSuffix = String(10000000 + ((i * 1732051) % 89999999)).padStart(8, '0');

    const tagPresets: string[][] = [
      ['prima casa', 'luminoso'],
      ['ristrutturato', 'investimento'],
      ['vista mare', 'terrazzo'],
      ['investimento', 'nuova costruzione'],
      ['giardino', 'prima casa'],
    ];

    demoList.push({
      id: `demo-${i + 1}`,
      name: names[i],
      phone: `33${phoneSuffix}`,
      email: `${names[i].toLowerCase().replace(/[^a-z]/g, '')}@gmail.com`,
      role,
      propertyType,
      zone,
      address: `Via ${streets[i % streets.length]} ${i + 1}, Milano`,
      price,
      sqm,
      rooms: propertyType === 'Box' ? '' : `${(i % 4) + 1} Vani`,
      floor: propertyType === 'Villa' || propertyType === 'Terreno' ? 'Terra' : `${(i % 5) + 1}° piano`,
      condoFees: 40 + ((i * 15) % 140),
      hasElevator: i % 2 === 0,
      hasBalcony: i % 3 !== 0,
      hasGarage: i % 4 === 0,
      status,
      reminderDate,
      note: `Cliente ${role} registrato per immobile in zona ${zone}. ${
        status === 'Trattativa'
          ? 'Proposta presentata e in fase di valutazione.'
          : 'Budget verificato.'
      }`,
      notes: `Cliente ${role} registrato per immobile in zona ${zone}. ${
        status === 'Trattativa'
          ? 'Proposta presentata e in fase di valutazione.'
          : 'Budget verificato.'
      }`,
      tags: tagPresets[i % tagPresets.length],
      history: normalizeHistory([
        {
          id: `demo-hist-${i + 1}-1`,
          date: localDateTimeValue(new Date(referenceNowMs - ((i % 5) + 1) * 86400000)),
          type: i % 2 === 0 ? 'Chiamata' : 'Visita',
          note:
            i % 2 === 0
              ? `Contatto telefonico iniziale per zona ${zone}.`
              : `Prima visita immobile in ${zone}, riscontro positivo.`,
        },
        {
          id: `demo-hist-${i + 1}-2`,
          date: localDateTimeValue(new Date(referenceNowMs - ((i % 5) + 4) * 86400000)),
          type: 'Email',
          note: 'Inviata scheda riepilogativa e planimetria.',
        },
      ]),
      photoBase64: '',
      photos: [],
      isFavorite: false,
    });
  }

  return demoList;
}

export function computeMetrics(pool: ClientRecord[], now: Date = new Date()): CrmMetrics {
  const total = pool.length;
  const active = pool.filter((c) => c.status === 'In corso' || c.status === 'Trattativa').length;
  const won = pool.filter((c) => c.status === 'Accettato').length;
  const lost = pool.filter((c) => c.status === 'Perso').length;

  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const remindersDue = pool.filter((c) => {
    if (!c.reminderDate) return false;
    const d = new Date(c.reminderDate);
    return !Number.isNaN(d.getTime()) && d <= endOfToday;
  }).length;

  const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;

  return { total, active, won, lost, remindersDue, conversionRate };
}

export function parseBudgetBound(raw: string): number | null {
  const trimmed = String(raw ?? '').trim().replace(/\s+/g, '');
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function filterAndSortClients(pool: ClientRecord[], filters: ClientFilters): ClientRecord[] {
  const query = filters.query.toLowerCase().trim();
  const selectedTag = (filters.tag || 'ALL').trim().toLowerCase();
  const hasMinPrice =
    typeof filters.minPrice === 'number' && Number.isFinite(filters.minPrice) && filters.minPrice >= 0;
  const hasMaxPrice =
    typeof filters.maxPrice === 'number' && Number.isFinite(filters.maxPrice) && filters.maxPrice >= 0;

  const filtered = pool.filter((c) => {
    const clientTags = normalizeTags(c.tags);
    const matchesQuery =
      query === '' ||
      String(c.name || '').toLowerCase().includes(query) ||
      String(c.phone || '').toLowerCase().includes(query) ||
      String(c.zone || '').toLowerCase().includes(query) ||
      String(c.address || '').toLowerCase().includes(query) ||
      String(c.propertyType || '').toLowerCase().includes(query) ||
      clientTags.some((t) => t.toLowerCase().includes(query));

    const matchesStatus = filters.status === 'ALL' || c.status === filters.status;
    const matchesRole = filters.role === 'ALL' || c.role === filters.role;
    const matchesTag =
      selectedTag === 'all' ||
      selectedTag === '' ||
      clientTags.some((t) => t.toLowerCase() === selectedTag);
    const matchesFavorite = !filters.favoritesOnly || Boolean(c.isFavorite);

    const clientPrice = Number(c.price) || 0;
    const matchesMinPrice = !hasMinPrice || clientPrice >= (filters.minPrice as number);
    const matchesMaxPrice = !hasMaxPrice || clientPrice <= (filters.maxPrice as number);
    const matchesPhotos = !filters.withPhotosOnly || getClientPhotos(c).length > 0;

    return (
      matchesQuery &&
      matchesStatus &&
      matchesRole &&
      matchesTag &&
      matchesFavorite &&
      matchesMinPrice &&
      matchesMaxPrice &&
      matchesPhotos
    );
  });

  if (filters.sortBy === 'name-asc') {
    return [...filtered].sort((a, b) => String(a.name).localeCompare(String(b.name), 'it'));
  }
  if (filters.sortBy === 'price-desc') {
    return [...filtered].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  }
  if (filters.sortBy === 'price-asc') {
    return [...filtered].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  }
  if (filters.sortBy === 'reminder-asc') {
    return [...filtered].sort((a, b) => {
      const da = a.reminderDate ? new Date(a.reminderDate).getTime() : Infinity;
      const db = b.reminderDate ? new Date(b.reminderDate).getTime() : Infinity;
      return da - db;
    });
  }

  return filtered;
}

export function computeMatches(pool: ClientRecord[], propertyId: string): MatchResult[] {
  const property = pool.find((c) => String(c.id) === String(propertyId));
  if (!property) return [];

  const targetBuyerRole: ClientRole = property.role === 'Locatore' ? 'Inquilino' : 'Acquirente';
  const buyers = pool.filter((c) => c.role === targetBuyerRole && c.status !== 'Perso');

  return buyers
    .map((buyer) => {
      let score = 0;
      const reasons: string[] = [];

      if (buyer.propertyType && property.propertyType && buyer.propertyType === property.propertyType) {
        score += 40;
        reasons.push(`Tipologia coincidente (${property.propertyType})`);
      }

      const bZone = (buyer.zone || '').trim().toLowerCase();
      const pZone = (property.zone || '').trim().toLowerCase();
      if (bZone && pZone && (bZone.includes(pZone) || pZone.includes(bZone))) {
        score += 40;
        reasons.push(`Zona compatibile (${property.zone})`);
      }

      const bPrice = Number(buyer.price) || 0;
      const pPrice = Number(property.price) || 0;
      if (bPrice > 0 && pPrice > 0 && bPrice >= pPrice) {
        score += 20;
        reasons.push(
          `Budget adeguato (€ ${bPrice.toLocaleString('it-IT')} >= € ${pPrice.toLocaleString('it-IT')})`,
        );
      }

      return { buyer, score, reasons };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function buildWhatsAppUrl(
  phone: string,
  name: string,
  zone?: string,
  propertyType?: string,
): string {
  let cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('00')) {
    cleanPhone = cleanPhone.slice(2);
  }
  const formattedPhone =
    cleanPhone.length === 10 && cleanPhone.startsWith('3') ? `39${cleanPhone}` : cleanPhone;

  let msg = `Buongiorno ${name}, sono il suo agente immobiliare. `;
  if (zone && propertyType) {
    msg += `Ho una novità immobiliare relativa ad un ${propertyType} in zona ${zone} che potrebbe interessarle molto! Quando possiamo sentirci?`;
  } else {
    msg += `Le scrivo in merito alle sue esigenze immobiliari. Ci sono novità interessanti!`;
  }

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
}

export function buildMapsUrl(address?: string, zone?: string): string | null {
  const mapQuery = [address, zone].filter((v) => v && v.trim()).join(' ').trim();
  if (!mapQuery) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
}

export function formatCurrencyEUR(price: number | undefined): string {
  if (!price || price <= 0) return 'N/D';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
}

export function generateCsvContent(pool: ClientRecord[]): string {
  const headers = [
    'Nome', 'Telefono', 'Email', 'Ruolo', 'Tipologia', 'Zona', 'Indirizzo',
    'Prezzo', 'Mq', 'Vani', 'Piano', 'SpeseCond', 'Esito', 'Promemoria', 'Etichette', 'Note',
  ];
  const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = pool.map((c) =>
    [
      c.name, c.phone, c.email, c.role, c.propertyType, c.zone, c.address,
      c.price || 0, c.sqm || 0, c.rooms || '', c.floor || '', c.condoFees || 0,
      c.status, c.reminderDate, normalizeTags(c.tags).join(', '), getClientNote(c),
    ].map(cell),
  );
  return '\uFEFF' + [headers.map(cell).join(';'), ...rows.map((row) => row.join(';'))].join('\r\n');
}

export function validateDigitalPayment(provider: string, accountVal: string): string | null {
  const trimmed = accountVal.trim();
  if (provider === 'PayPal') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'Inserisci un indirizzo email PayPal valido.';
    }
    return null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return `Inserisci un numero di cellulare valido per ${provider}.`;
  }
  return null;
}

export function validateCardPayment(
  holder: string,
  cardNumberRaw: string,
  expiryRaw: string,
  cvvRaw: string,
  now: Date = new Date(),
): string | null {
  const cardNum = cardNumberRaw.replace(/\s+/g, '');
  const expiry = expiryRaw.trim();
  const cvv = cvvRaw.trim();

  if (
    !holder.trim() ||
    !/^\d{13,19}$/.test(cardNum) ||
    !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) ||
    !/^\d{3,4}$/.test(cvv)
  ) {
    return 'Inserisci dati carta validi (intestatario, numero 13-19 cifre, scadenza MM/AA e CVV).';
  }

  const [mm, yy] = expiry.split('/').map(Number);
  const expDate = new Date(2000 + yy, mm, 0, 23, 59, 59);
  if (expDate < now) {
    return 'La carta inserita risulta scaduta. Inserisci una data valida.';
  }

  return null;
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildUpcoming7DaysBuckets(
  pool: ClientRecord[],
  referenceNow: Date = new Date(),
): UpcomingDayBucket[] {
  const startOfToday = new Date(
    referenceNow.getFullYear(),
    referenceNow.getMonth(),
    referenceNow.getDate(),
  );

  const buckets: UpcomingDayBucket[] = [];
  const bucketMap = new Map<string, UpcomingDayBucket>();

  for (let offset = 0; offset < 7; offset++) {
    const dayDate = new Date(
      startOfToday.getFullYear(),
      startOfToday.getMonth(),
      startOfToday.getDate() + offset,
    );
    const dateKey = toLocalDateKey(dayDate);

    const weekdayShort = dayDate.toLocaleDateString('it-IT', { weekday: 'short' });
    const dayNum = dayDate.getDate();
    const shortLabel =
      offset === 0
        ? `Oggi (${dayNum})`
        : `${weekdayShort.charAt(0).toUpperCase()}${weekdayShort.slice(1).replace('.', '')} ${dayNum}`;

    const fullFormatted = dayDate.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const fullLabel =
      offset === 0
        ? `Oggi, ${fullFormatted}`
        : `${fullFormatted.charAt(0).toUpperCase()}${fullFormatted.slice(1)}`;

    const bucket: UpcomingDayBucket = {
      dateKey,
      shortLabel,
      fullLabel,
      count: 0,
      clients: [],
    };
    buckets.push(bucket);
    bucketMap.set(dateKey, bucket);
  }

  for (const client of pool) {
    if (!client.reminderDate) continue;
    const rDate = new Date(client.reminderDate);
    if (Number.isNaN(rDate.getTime())) continue;
    const key = toLocalDateKey(rDate);
    const targetBucket = bucketMap.get(key);
    if (targetBucket) {
      targetBucket.clients.push(client);
    }
  }

  for (const bucket of buckets) {
    bucket.clients.sort(
      (a, b) => new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime(),
    );
    bucket.count = bucket.clients.length;
  }

  return buckets;
}

export function filterRemindersByDay(
  pool: ClientRecord[],
  dayKey: string | null,
): ClientRecord[] {
  const withReminders = pool.filter(
    (c) => c.reminderDate && !Number.isNaN(new Date(c.reminderDate).getTime()),
  );

  const filtered = dayKey
    ? withReminders.filter((c) => toLocalDateKey(new Date(c.reminderDate)) === dayKey)
    : withReminders;

  return [...filtered].sort(
    (a, b) => new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime(),
  );
}

