import type {
  BillingCycle,
  ClientFilters,
  ClientInteraction,
  ClientRecord,
  ClientRole,
  ClientStatus,
  CrmMetrics,
  InteractionType,
  MatchResult,
  PaidPlanTier,
  PlanTier,
  SubscriptionStatus,
  UpcomingDayBucket,
  UserAccount,
} from '../types/crm';
import { type AppLanguage, getLocale, translatePropertyType } from './i18n';

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

export function formatInteractionDate(dateStr: string, lang: AppLanguage = 'it'): string {
  if (!dateStr) return lang === 'en' ? 'Date not specified' : 'Data non indicata';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  const hasTime = dateStr.includes('T');
  const locale = getLocale(lang);
  return hasTime
    ? parsed.toLocaleString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : parsed.toLocaleDateString(locale, {
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

export const SUBSCRIPTION_WARNING_DAYS = 5;
const DAY_MS = 86_400_000;

export function getBillingCycleDurationDays(cycle: BillingCycle): number {
  return cycle === 'annual' ? 365 : 30;
}

export function resolveBillingCycle(plan: PaidPlanTier, requested?: BillingCycle): BillingCycle {
  if (plan === 'agency') return 'annual';
  return requested === 'annual' ? 'annual' : 'monthly';
}

export function computeSubscriptionExpiry(
  nowMs: number,
  plan: PaidPlanTier,
  billingCycle?: BillingCycle,
  existingExpiresAt?: string,
): string {
  const cycle = resolveBillingCycle(plan, billingCycle);
  const durationMs = getBillingCycleDurationDays(cycle) * DAY_MS;
  const existingMs = existingExpiresAt ? Date.parse(existingExpiresAt) : NaN;
  const baseMs = Number.isFinite(existingMs) && existingMs > nowMs ? existingMs : nowMs;
  return new Date(baseMs + durationMs).toISOString();
}

export function resolveSubscriptionExpiresMs(user: UserAccount | null): number | null {
  if (!user) return null;
  const rawPlan = String((user as { plan?: unknown }).plan ?? '');
  if (rawPlan !== 'agency' && rawPlan !== 'pro' && rawPlan !== 'full' && rawPlan !== 'basic') {
    return null;
  }
  if (user.expiresAt) {
    const parsed = Date.parse(user.expiresAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (user.activatedAt) {
    const activatedMs = Date.parse(user.activatedAt);
    if (Number.isFinite(activatedMs)) {
      const cycle: BillingCycle =
        rawPlan === 'agency' ? 'annual' : user.billingCycle === 'annual' ? 'annual' : 'monthly';
      return activatedMs + getBillingCycleDurationDays(cycle) * DAY_MS;
    }
  }
  return null;
}

export function evaluateSubscriptionStatus(
  user: UserAccount | null,
  nowMs: number = Date.now(),
): SubscriptionStatus {
  if (!user) {
    return {
      phase: 'free',
      plan: 'free',
      expiresAt: null,
      daysRemaining: null,
      billingCycle: 'monthly',
    };
  }

  const rawPlan = String((user as { plan?: unknown }).plan ?? '');
  const mappedPlan: PlanTier =
    rawPlan === 'agency'
      ? 'agency'
      : rawPlan === 'pro' || rawPlan === 'full' || rawPlan === 'basic'
        ? 'pro'
        : 'free';

  if (mappedPlan === 'free') {
    if (user.expiredFromPlan) {
      return {
        phase: 'expired',
        plan: 'free',
        expiresAt: user.expiresAt || user.expiredAt || null,
        daysRemaining: 0,
        billingCycle: user.billingCycle || (user.expiredFromPlan === 'agency' ? 'annual' : 'monthly'),
        expiredFromPlan: user.expiredFromPlan,
      };
    }
    return {
      phase: 'free',
      plan: 'free',
      expiresAt: null,
      daysRemaining: null,
      billingCycle: 'monthly',
    };
  }

  const paidPlan: PaidPlanTier = mappedPlan;
  const cycle = resolveBillingCycle(paidPlan, user.billingCycle);
  const expiresMs = resolveSubscriptionExpiresMs(user);

  if (expiresMs === null) {
    return {
      phase: 'active',
      plan: paidPlan,
      expiresAt: null,
      daysRemaining: null,
      billingCycle: cycle,
    };
  }

  const remainingMs = expiresMs - nowMs;
  if (remainingMs <= 0) {
    return {
      phase: 'expired',
      plan: 'free',
      expiresAt: new Date(expiresMs).toISOString(),
      daysRemaining: 0,
      billingCycle: cycle,
      expiredFromPlan: paidPlan,
    };
  }

  const daysRemaining = Math.max(1, Math.ceil(remainingMs / DAY_MS));
  return {
    phase: daysRemaining <= SUBSCRIPTION_WARNING_DAYS ? 'expiring_soon' : 'active',
    plan: paidPlan,
    expiresAt: new Date(expiresMs).toISOString(),
    daysRemaining,
    billingCycle: cycle,
  };
}

export function reconcileExpiredSubscription(
  user: UserAccount,
  nowMs: number = Date.now(),
): { user: UserAccount; downgradedFrom: PaidPlanTier | null } {
  const status = evaluateSubscriptionStatus(user, nowMs);
  if (
    status.phase === 'expired' &&
    status.expiredFromPlan &&
    (user.plan === 'pro' || user.plan === 'agency' || String(user.plan) === 'full' || String(user.plan) === 'basic')
  ) {
    return {
      user: {
        ...user,
        plan: 'free',
        expiredFromPlan: status.expiredFromPlan,
        expiredAt: new Date(nowMs).toISOString(),
      },
      downgradedFrom: status.expiredFromPlan,
    };
  }
  return { user, downgradedFrom: null };
}

export type StripeRedirectPlan = 'monthly_1490' | 'annual_99' | 'pro_149';

export const STRIPE_MONTHLY_FALLBACK_EMAIL = 'mensile@immopulse.local';
export const STRIPE_ANNUAL_FALLBACK_EMAIL = 'annuale@immopulse.local';
export const STRIPE_PRO_FALLBACK_EMAIL = 'pro@immopulse.local';

export function parsePaidRedirectParam(search: string): StripeRedirectPlan | null {
  if (!search || typeof search !== 'string') return null;
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const val = params.get('pagato')?.trim().toLowerCase();
    if (val === 'mensile' || val === 'monthly' || val === 'true') return 'monthly_1490';
    if (val === 'annuale' || val === 'annual') return 'annual_99';
    if (val === 'pro') return 'pro_149';
    return null;
  } catch {
    return null;
  }
}

export function hasPaidRedirectParam(search: string): boolean {
  return parsePaidRedirectParam(search) !== null;
}

export function hasPaymentSuccessParam(search: string): boolean {
  if (!search || typeof search !== 'string') return false;
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    return params.get('payment')?.trim().toLowerCase() === 'success';
  } catch {
    return false;
  }
}

export function stripPaidRedirectParam(href: string): string {
  try {
    const url = new URL(href, 'https://immopulse.local');
    url.searchParams.delete('pagato');
    url.searchParams.delete('payment');
    const searchStr = url.searchParams.toString();
    return `${url.pathname}${searchStr ? `?${searchStr}` : ''}${url.hash}`;
  } catch {
    return href;
  }
}

export const PAYMENT_SUCCESS_FALLBACK_EMAIL = 'pro-stripe@immopulse.local';

export function applyPaymentSuccessActivation(
  accounts: UserAccount[],
  sessionEmail: string | null,
  nowMs: number = Date.now(),
  activatedAtOverride?: string | null,
): { accounts: UserAccount[]; activatedUser: UserAccount; sessionEmail: string; activatedAt: string } {
  const activatedAt =
    activatedAtOverride && Number.isFinite(Date.parse(activatedAtOverride))
      ? activatedAtOverride
      : new Date(nowMs).toISOString();
  const baseNowMs = Date.parse(activatedAt);
  const safeBaseMs = Number.isFinite(baseNowMs) ? baseNowMs : nowMs;

  const targetIdx =
    sessionEmail && sessionEmail.trim()
      ? accounts.findIndex((a) => a.email === sessionEmail)
      : accounts.findIndex((a) => a.email === PAYMENT_SUCCESS_FALLBACK_EMAIL);

  if (targetIdx !== -1) {
    const existing = accounts[targetIdx];
    const targetPlan: PaidPlanTier = existing.plan === 'agency' ? 'agency' : 'pro';
    const targetCycle: BillingCycle = existing.billingCycle === 'monthly' ? 'monthly' : 'annual';
    const activatedUser: UserAccount = {
      ...existing,
      plan: targetPlan,
      billingCycle: targetCycle,
      paymentMethod: 'Stripe',
      activatedAt,
      expiresAt: computeSubscriptionExpiry(safeBaseMs, targetPlan, targetCycle),
      expiredFromPlan: undefined,
      expiredAt: undefined,
    };
    const nextAccounts = accounts.map((a, i) => (i === targetIdx ? activatedUser : a));
    return {
      accounts: nextAccounts,
      activatedUser,
      sessionEmail: activatedUser.email,
      activatedAt,
    };
  }

  const resolvedEmail =
    sessionEmail && sessionEmail.trim() ? sessionEmail.trim() : PAYMENT_SUCCESS_FALLBACK_EMAIL;
  const createdUser: UserAccount = {
    name: 'ImmoPulse Pro',
    email: resolvedEmail,
    password: '',
    plan: 'pro',
    billingCycle: 'annual',
    paymentMethod: 'Stripe',
    activatedAt,
    expiresAt: computeSubscriptionExpiry(safeBaseMs, 'pro', 'annual'),
  };
  return {
    accounts: [...accounts, createdUser],
    activatedUser: createdUser,
    sessionEmail: createdUser.email,
    activatedAt,
  };
}

export function applyStripePlanActivation(
  accounts: UserAccount[],
  sessionEmail: string | null,
  redirectPlan: StripeRedirectPlan,
  nowMs: number = Date.now(),
): { accounts: UserAccount[]; activatedUser: UserAccount; sessionEmail: string } {
  const nowIso = new Date(nowMs).toISOString();
  const targetPlan: PaidPlanTier = redirectPlan === 'pro_149' ? 'agency' : 'pro';
  const targetCycle: BillingCycle = redirectPlan === 'monthly_1490' ? 'monthly' : 'annual';
  const defaultFallbackEmail =
    redirectPlan === 'pro_149'
      ? STRIPE_PRO_FALLBACK_EMAIL
      : redirectPlan === 'annual_99'
        ? STRIPE_ANNUAL_FALLBACK_EMAIL
        : STRIPE_MONTHLY_FALLBACK_EMAIL;
  const defaultFallbackName =
    redirectPlan === 'pro_149'
      ? 'Licenza Pro'
      : redirectPlan === 'annual_99'
        ? 'Abbonamento Annuale'
        : 'Abbonamento Mensile';

  const targetIdx =
    sessionEmail && sessionEmail.trim()
      ? accounts.findIndex((a) => a.email === sessionEmail)
      : accounts.findIndex((a) => a.email === defaultFallbackEmail);

  if (targetIdx !== -1) {
    const existing = accounts[targetIdx];
    const recentActivationMs = existing.activatedAt ? Date.parse(existing.activatedAt) : NaN;
    if (
      existing.plan === targetPlan &&
      existing.billingCycle === targetCycle &&
      existing.paymentMethod === 'Stripe' &&
      Number.isFinite(recentActivationMs) &&
      Math.abs(nowMs - recentActivationMs) < 60_000
    ) {
      return { accounts, activatedUser: existing, sessionEmail: existing.email };
    }

    const baseExpiry =
      existing.plan === targetPlan && existing.billingCycle === targetCycle
        ? existing.expiresAt
        : undefined;
    const activatedUser: UserAccount = {
      ...existing,
      plan: targetPlan,
      billingCycle: targetCycle,
      paymentMethod: 'Stripe',
      activatedAt: nowIso,
      expiresAt: computeSubscriptionExpiry(nowMs, targetPlan, targetCycle, baseExpiry),
      expiredFromPlan: undefined,
      expiredAt: undefined,
    };
    const nextAccounts = accounts.map((a, i) => (i === targetIdx ? activatedUser : a));
    return { accounts: nextAccounts, activatedUser, sessionEmail: activatedUser.email };
  }

  const resolvedEmail = sessionEmail && sessionEmail.trim() ? sessionEmail.trim() : defaultFallbackEmail;
  const createdUser: UserAccount = {
    name: defaultFallbackName,
    email: resolvedEmail,
    password: '',
    plan: targetPlan,
    billingCycle: targetCycle,
    paymentMethod: 'Stripe',
    activatedAt: nowIso,
    expiresAt: computeSubscriptionExpiry(nowMs, targetPlan, targetCycle),
  };
  return {
    accounts: [...accounts, createdUser],
    activatedUser: createdUser,
    sessionEmail: createdUser.email,
  };
}

export function applyStripeProActivation(
  accounts: UserAccount[],
  sessionEmail: string | null,
  nowMs: number = Date.now(),
): { accounts: UserAccount[]; activatedUser: UserAccount; sessionEmail: string } {
  return applyStripePlanActivation(accounts, sessionEmail, 'monthly_1490', nowMs);
}

export const LICENSE_FALLBACK_EMAIL = 'licenza@immopulse.local';

export type LicenseValidationResult =
  | {
      valid: true;
      normalizedCode: string;
      plan: PaidPlanTier;
      billingCycle: BillingCycle;
    }
  | {
      valid: false;
      error: string;
    };

export function validateLicenseCode(
  rawCode: string,
  lang: AppLanguage = 'it',
): LicenseValidationResult {
  const normalized = String(rawCode ?? '').trim().toUpperCase();
  if (!normalized) {
    return {
      valid: false,
      error:
        lang === 'en'
          ? 'Enter a license code to verify.'
          : 'Inserisci un codice licenza da verificare.',
    };
  }

  if (/\s/.test(normalized) || normalized.length < 6 || normalized.length > 48) {
    return {
      valid: false,
      error:
        lang === 'en'
          ? 'Invalid license code. Use a valid format (e.g. IMMOPULSE2026 or IMMO-PRO-2026).'
          : 'Codice licenza non valido. Inserisci un formato valido (es. IMMOPULSE2026 o IMMO-PRO-2026).',
    };
  }

  const isKnownPrefix = /^(IMMOPULSE|IMMO|IMP|PRO|AGENTE|AGENZIA|TEAM|LIC)[A-Z0-9-]{2,}$/.test(
    normalized,
  );
  const isSegmentedKey = /^[A-Z0-9]{4,6}(-[A-Z0-9]{4,6}){1,3}$/.test(normalized);

  if (!isKnownPrefix && !isSegmentedKey) {
    return {
      valid: false,
      error:
        lang === 'en'
          ? 'Unrecognized license code. Check the code received after purchase (e.g. IMMOPULSE2026).'
          : 'Codice licenza non riconosciuto. Controlla il codice ricevuto dopo l’acquisto (es. IMMOPULSE2026).',
    };
  }

  const isAgencyKey =
    normalized.includes('AGENZIA') ||
    normalized.includes('AGENCY') ||
    normalized.includes('TEAM');

  return {
    valid: true,
    normalizedCode: normalized,
    plan: isAgencyKey ? 'agency' : 'pro',
    billingCycle: 'annual',
  };
}

export type LicenseActivationResult =
  | {
      ok: true;
      accounts: UserAccount[];
      activatedUser: UserAccount;
      sessionEmail: string;
      normalizedCode: string;
      plan: PaidPlanTier;
      billingCycle: BillingCycle;
    }
  | {
      ok: false;
      error: string;
    };

export function applyLicenseCodeActivation(
  accounts: UserAccount[],
  sessionEmail: string | null,
  rawCode: string,
  nowMs: number = Date.now(),
  lang: AppLanguage = 'it',
): LicenseActivationResult {
  const checked = validateLicenseCode(rawCode, lang);
  if (!checked.valid) {
    return { ok: false, error: checked.error };
  }

  const nowIso = new Date(nowMs).toISOString();
  const targetPlan = checked.plan;
  const targetCycle = checked.billingCycle;

  const targetIdx =
    sessionEmail && sessionEmail.trim()
      ? accounts.findIndex((a) => a.email === sessionEmail)
      : accounts.findIndex((a) => a.email === LICENSE_FALLBACK_EMAIL);

  if (targetIdx !== -1) {
    const existing = accounts[targetIdx];
    const activatedUser: UserAccount = {
      ...existing,
      plan: targetPlan,
      billingCycle: targetCycle,
      paymentMethod: `Licenza (${checked.normalizedCode})`,
      licenseCode: checked.normalizedCode,
      activatedAt: nowIso,
      expiresAt: computeSubscriptionExpiry(nowMs, targetPlan, targetCycle),
      expiredFromPlan: undefined,
      expiredAt: undefined,
    };
    const nextAccounts = accounts.map((a, i) => (i === targetIdx ? activatedUser : a));
    return {
      ok: true,
      accounts: nextAccounts,
      activatedUser,
      sessionEmail: activatedUser.email,
      normalizedCode: checked.normalizedCode,
      plan: targetPlan,
      billingCycle: targetCycle,
    };
  }

  const resolvedEmail =
    sessionEmail && sessionEmail.trim() ? sessionEmail.trim() : LICENSE_FALLBACK_EMAIL;
  const defaultName =
    targetPlan === 'agency'
      ? lang === 'en'
        ? 'Agency Pro License'
        : 'Licenza Agenzia Pro'
      : lang === 'en'
        ? 'Agent Pro License'
        : 'Licenza Agente Pro';

  const createdUser: UserAccount = {
    name: defaultName,
    email: resolvedEmail,
    password: '',
    plan: targetPlan,
    billingCycle: targetCycle,
    paymentMethod: `Licenza (${checked.normalizedCode})`,
    licenseCode: checked.normalizedCode,
    activatedAt: nowIso,
    expiresAt: computeSubscriptionExpiry(nowMs, targetPlan, targetCycle),
  };

  return {
    ok: true,
    accounts: [...accounts, createdUser],
    activatedUser: createdUser,
    sessionEmail: createdUser.email,
    normalizedCode: checked.normalizedCode,
    plan: targetPlan,
    billingCycle: targetCycle,
  };
}

export function getSubscriptionPlanLabel(
  plan: PaidPlanTier,
  billingCycle?: BillingCycle,
  lang: AppLanguage = 'it',
): string {
  if (lang === 'en') {
    if (plan === 'agency') return 'Agency / Team (Annual)';
    return billingCycle === 'annual' ? 'Individual Pro (Annual)' : 'Individual Pro (Monthly)';
  }
  if (plan === 'agency') return 'Agenzia / Team (Annuale)';
  return billingCycle === 'annual' ? 'Singolo Pro (Annuale)' : 'Singolo Pro (Mensile)';
}

export function getActivePlan(user: UserAccount | null, nowMs: number = Date.now()): PlanTier {
  return evaluateSubscriptionStatus(user, nowMs).plan;
}

export function getClientLimit(plan: PlanTier): number {
  if (plan === 'pro' || plan === 'agency') return Infinity;
  return 3;
}

export function canUseWhatsAppAndMap(plan: PlanTier): boolean {
  return plan === 'pro' || plan === 'agency';
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

export function computeMatches(
  pool: ClientRecord[],
  propertyId: string,
  lang: AppLanguage = 'it',
): MatchResult[] {
  const property = pool.find((c) => String(c.id) === String(propertyId));
  if (!property) return [];

  const targetBuyerRole: ClientRole = property.role === 'Locatore' ? 'Inquilino' : 'Acquirente';
  const buyers = pool.filter((c) => c.role === targetBuyerRole && c.status !== 'Perso');
  const locale = getLocale(lang);

  return buyers
    .map((buyer) => {
      let score = 0;
      const reasons: string[] = [];

      if (buyer.propertyType && property.propertyType && buyer.propertyType === property.propertyType) {
        score += 40;
        const typeLabel = translatePropertyType(property.propertyType, lang);
        reasons.push(
          lang === 'en'
            ? `Matching property type (${typeLabel})`
            : `Tipologia coincidente (${property.propertyType})`,
        );
      }

      const bZone = (buyer.zone || '').trim().toLowerCase();
      const pZone = (property.zone || '').trim().toLowerCase();
      if (bZone && pZone && (bZone.includes(pZone) || pZone.includes(bZone))) {
        score += 40;
        reasons.push(
          lang === 'en'
            ? `Compatible area (${property.zone})`
            : `Zona compatibile (${property.zone})`,
        );
      }

      const bPrice = Number(buyer.price) || 0;
      const pPrice = Number(property.price) || 0;
      if (bPrice > 0 && pPrice > 0 && bPrice >= pPrice) {
        score += 20;
        reasons.push(
          lang === 'en'
            ? `Sufficient budget (€ ${bPrice.toLocaleString(locale)} >= € ${pPrice.toLocaleString(locale)})`
            : `Budget adeguato (€ ${bPrice.toLocaleString('it-IT')} >= € ${pPrice.toLocaleString('it-IT')})`,
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
  lang: AppLanguage = 'it',
): string {
  let cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('00')) {
    cleanPhone = cleanPhone.slice(2);
  }
  const formattedPhone =
    cleanPhone.length === 10 && cleanPhone.startsWith('3') ? `39${cleanPhone}` : cleanPhone;

  let msg = '';
  if (lang === 'en') {
    const typeLabel = propertyType ? translatePropertyType(propertyType, 'en') : '';
    msg = `Hello ${name}, I'm your real estate agent. `;
    if (zone && typeLabel) {
      msg += `I have an exciting property update regarding a ${typeLabel} in ${zone} that might interest you! When can we talk?`;
    } else {
      msg += `I'm writing regarding your property requirements. I have some great updates!`;
    }
  } else {
    msg = `Buongiorno ${name}, sono il suo agente immobiliare. `;
    if (zone && propertyType) {
      msg += `Ho una novità immobiliare relativa ad un ${propertyType} in zona ${zone} che potrebbe interessarle molto! Quando possiamo sentirci?`;
    } else {
      msg += `Le scrivo in merito alle sue esigenze immobiliari. Ci sono novità interessanti!`;
    }
  }

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
}

export function buildMapsUrl(address?: string, zone?: string): string | null {
  const mapQuery = [address, zone].filter((v) => v && v.trim()).join(' ').trim();
  if (!mapQuery) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
}

export function formatCurrencyEUR(price: number | undefined, lang: AppLanguage = 'it'): string {
  if (!price || price <= 0) return lang === 'en' ? 'N/A' : 'N/D';
  return new Intl.NumberFormat(getLocale(lang), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
}

export function generateCsvContent(pool: ClientRecord[], lang: AppLanguage = 'it'): string {
  const headers =
    lang === 'en'
      ? [
          'Name', 'Phone', 'Email', 'Role', 'Property Type', 'Area', 'Address',
          'Price', 'Sqm', 'Rooms', 'Floor', 'Condo Fees', 'Status', 'Reminder', 'Tags', 'Notes',
        ]
      : [
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

export function validateDigitalPayment(
  provider: string,
  accountVal: string,
  lang: AppLanguage = 'it',
): string | null {
  const trimmed = accountVal.trim();
  if (provider === 'PayPal') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return lang === 'en'
        ? 'Enter a valid PayPal email address.'
        : 'Inserisci un indirizzo email PayPal valido.';
    }
    return null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return lang === 'en'
      ? `Enter a valid mobile number for ${provider}.`
      : `Inserisci un numero di cellulare valido per ${provider}.`;
  }
  return null;
}

export function validateCardPayment(
  holder: string,
  cardNumberRaw: string,
  expiryRaw: string,
  cvvRaw: string,
  now: Date = new Date(),
  lang: AppLanguage = 'it',
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
    return lang === 'en'
      ? 'Enter valid card details (cardholder name, 13-19 digit number, MM/YY expiry and CVV).'
      : 'Inserisci dati carta validi (intestatario, numero 13-19 cifre, scadenza MM/AA e CVV).';
  }

  const [mm, yy] = expiry.split('/').map(Number);
  const expDate = new Date(2000 + yy, mm, 0, 23, 59, 59);
  if (expDate < now) {
    return lang === 'en'
      ? 'The entered card appears expired. Please enter a valid expiration date.'
      : 'La carta inserita risulta scaduta. Inserisci una data valida.';
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
  lang: AppLanguage = 'it',
): UpcomingDayBucket[] {
  const startOfToday = new Date(
    referenceNow.getFullYear(),
    referenceNow.getMonth(),
    referenceNow.getDate(),
  );

  const buckets: UpcomingDayBucket[] = [];
  const bucketMap = new Map<string, UpcomingDayBucket>();
  const locale = getLocale(lang);
  const todayWord = lang === 'en' ? 'Today' : 'Oggi';

  for (let offset = 0; offset < 7; offset++) {
    const dayDate = new Date(
      startOfToday.getFullYear(),
      startOfToday.getMonth(),
      startOfToday.getDate() + offset,
    );
    const dateKey = toLocalDateKey(dayDate);

    const weekdayShort = dayDate.toLocaleDateString(locale, { weekday: 'short' });
    const dayNum = dayDate.getDate();
    const shortLabel =
      offset === 0
        ? `${todayWord} (${dayNum})`
        : `${weekdayShort.charAt(0).toUpperCase()}${weekdayShort.slice(1).replace('.', '')} ${dayNum}`;

    const fullFormatted = dayDate.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const fullLabel =
      offset === 0
        ? `${todayWord}, ${fullFormatted}`
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

