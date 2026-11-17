import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addTagToList,
  applyDeleteClientSync,
  applyLicenseCodeActivation,
  applyPaymentSuccessActivation,
  applyStripePlanActivation,
  applyStripeProActivation,
  applyUpsertClientSync,
  buildMapsUrl,
  buildUpcoming7DaysBuckets,
  buildWhatsAppUrl,
  canUseAgencySync,
  canUseWhatsAppAndMap,
  computeMatches,
  computeMetrics,
  computeSubscriptionExpiry,
  encodeArg,
  evaluateSubscriptionStatus,
  filterAndSortClients,
  filterRemindersByDay,
  generateAgencyCode,
  generateCsvContent,
  generateDemoClients,
  getActivePlan,
  getAvailableTags,
  getClientLimit,
  getClientNote,
  getClientPhotos,
  getLatestInteraction,
  getSubscriptionPlanLabel,
  getVisibleClientsPool,
  hasPaidRedirectParam,
  hasPaymentSuccessParam,
  isValidClient,
  LICENSE_FALLBACK_EMAIL,
  normalizeAgencyCode,
  normalizeClientRecord,
  normalizeHistory,
  normalizeTags,
  parseBudgetBound,
  parsePaidRedirectParam,
  PAYMENT_SUCCESS_FALLBACK_EMAIL,
  reconcileExpiredSubscription,
  removeTagFromList,
  STRIPE_ANNUAL_FALLBACK_EMAIL,
  STRIPE_MONTHLY_FALLBACK_EMAIL,
  STRIPE_PRO_FALLBACK_EMAIL,
  stripPaidRedirectParam,
  SUBSCRIPTION_WARNING_DAYS,
  toLocalDateKey,
  toggleClientFavorite,
  validateCardPayment,
  validateDigitalPayment,
  validateLicenseCode,
} from './crmLogic';
import { clearProActiveFlag, loadProActiveFlag, saveProActiveFlag } from './storage';

test('encodeArg encodes apostrophes and special characters safely', () => {
  const encoded = encodeArg("Antonio D'Amico (Sant'Ambrogio)!");
  assert.equal(encoded.includes("'"), false);
  assert.equal(encoded.includes('('), false);
  assert.equal(encoded.includes(')'), false);
  assert.equal(encoded.includes('!'), false);
  assert.equal(decodeURIComponent(encoded), "Antonio D'Amico (Sant'Ambrogio)!");
});

test('plan limits and channel permissions enforce Free (3), Singolo Pro (Infinity), and Agenzia (Infinity)', () => {
  assert.equal(getClientLimit('free'), 3);
  assert.equal(getClientLimit('pro'), Infinity);
  assert.equal(getClientLimit('agency'), Infinity);

  assert.equal(canUseWhatsAppAndMap('free'), false);
  assert.equal(canUseWhatsAppAndMap('pro'), true);
  assert.equal(canUseWhatsAppAndMap('agency'), true);

  const demo50 = generateDemoClients(50, new Date('2026-11-14T10:00:00Z').getTime());
  assert.equal(demo50.length, 50);
  assert.equal(getVisibleClientsPool(demo50, 'free').length, 3);
  assert.equal(getVisibleClientsPool(demo50, 'pro').length, 50);
  assert.equal(getVisibleClientsPool(demo50, 'agency').length, 50);

  // Legacy stored accounts ('basic' | 'full') upgrade seamlessly to 'pro' while subscription is active
  const legacyRefNow = Date.parse('2026-01-10T00:00:00Z');
  assert.equal(
    getActivePlan(
      {
        name: 'Legacy',
        email: 'legacy@agenzia.it',
        password: 'secret',
        plan: 'basic' as unknown as 'pro',
        paymentMethod: 'PayPal',
        activatedAt: '2026-01-01T00:00:00Z',
      },
      legacyRefNow,
    ),
    'pro',
  );
  assert.equal(
    getActivePlan(
      {
        name: 'Legacy Full',
        email: 'full@agenzia.it',
        password: 'secret',
        plan: 'full' as unknown as 'pro',
        paymentMethod: 'PayPal',
        activatedAt: '2026-01-01T00:00:00Z',
      },
      legacyRefNow,
    ),
    'pro',
  );
});

test('filterAndSortClients handles search with apostrophes, status, role, and price sort', () => {
  const demo = generateDemoClients(50, new Date('2026-11-14T10:00:00Z').getTime());
  const byApostrophe = filterAndSortClients(demo, {
    query: "D'Amico",
    status: 'ALL',
    role: 'ALL',
    sortBy: 'default',
  });
  assert.equal(byApostrophe.length, 1);
  assert.equal(byApostrophe[0].name, "Antonio D'Amico");

  const sortedDesc = filterAndSortClients(demo.slice(0, 5), {
    query: '',
    status: 'ALL',
    role: 'ALL',
    sortBy: 'price-desc',
  });
  assert.ok(sortedDesc[0].price >= sortedDesc[1].price);
});

test('computeMetrics calculates counts, conversion rate, and due reminders accurately', () => {
  const now = new Date(2026, 10, 14, 10, 0, 0);
  const demo = generateDemoClients(10, now.getTime());
  const metrics = computeMetrics(demo, now);
  assert.equal(metrics.total, 10);
  assert.equal(metrics.active + metrics.won + metrics.lost, 10);
  assert.ok(metrics.remindersDue >= 1);
});

test('computeMatches scores property against compatible buyers/tenants', () => {
  const demo = generateDemoClients(10, new Date('2026-11-14T10:00:00Z').getTime());
  // demo[1] is Venditore, Appartamento, Centro Storico, 295000
  // demo[0] is Acquirente, Appartamento, Centro Storico, 320000 (status: In corso)
  const matches = computeMatches(demo, 'demo-2');
  assert.ok(matches.length >= 1);
  assert.equal(matches[0].buyer.id, 'demo-1');
  assert.equal(matches[0].score, 100);
});

test('WhatsApp, Maps URL, CSV generation, and client validation work cleanly', () => {
  const wa = buildWhatsAppUrl('339 123 4567', "Antonio D'Amico", 'Brera', 'Appartamento');
  assert.ok(wa.startsWith('https://wa.me/393391234567?text='));

  assert.equal(buildMapsUrl('Via Roma 1', 'Milano'), 'https://www.google.com/maps/search/?api=1&query=Via%20Roma%201%20Milano');
  assert.equal(buildMapsUrl('', ''), null);

  const demo = generateDemoClients(2);
  assert.equal(demo.every(isValidClient), true);
  assert.deepEqual(getClientPhotos(demo[0]), []);

  const csv = generateCsvContent(demo);
  assert.ok(csv.includes('"Marco Rossi"'));
  assert.ok(csv.includes('"Luca Bianchi"'));
});

test('payment validation enforces email/phone and non-expired card checks', () => {
  assert.equal(validateDigitalPayment('PayPal', 'mario@agenzia.it'), null);
  assert.notEqual(validateDigitalPayment('PayPal', 'invalid-email'), null);
  assert.equal(validateDigitalPayment('Satispay', '3391234567'), null);
  assert.notEqual(validateDigitalPayment('Satispay', '123'), null);

  const refNow = new Date(2026, 10, 14);
  assert.equal(validateCardPayment('Marco Rossi', '4023 6000 1234 5678', '12/28', '123', refNow), null);
  assert.notEqual(validateCardPayment('Marco Rossi', '4023 6000 1234 5678', '01/20', '123', refNow), null);
});

test('buildUpcoming7DaysBuckets and filterRemindersByDay group and filter 7-day callbacks accurately', () => {
  const refNow = new Date(2026, 10, 14, 9, 0, 0);
  const demo = generateDemoClients(6, refNow.getTime());
  // Ensure deterministic reminders across today, +2 days, and +9 days (outside 7-day window)
  const customPool = [
    { ...demo[0], id: 'd0', reminderDate: '2026-11-14T15:00' },
    { ...demo[1], id: 'd1', reminderDate: '2026-11-14T11:30' },
    { ...demo[2], id: 'd2', reminderDate: '2026-11-16T10:00' },
    { ...demo[3], id: 'd3', reminderDate: '2026-11-23T10:00' }, // day +9, excluded from 7-day chart
    { ...demo[4], id: 'd4', reminderDate: '' },
  ];

  const buckets = buildUpcoming7DaysBuckets(customPool, refNow);
  assert.equal(buckets.length, 7);
  assert.equal(buckets[0].dateKey, toLocalDateKey(refNow));
  assert.equal(buckets[0].count, 2);
  // Sorted chronologically inside bucket (11:30 before 15:00)
  assert.equal(buckets[0].clients[0].id, 'd1');
  assert.equal(buckets[0].clients[1].id, 'd0');
  assert.equal(buckets[2].dateKey, '2026-11-16');
  assert.equal(buckets[2].count, 1);
  assert.equal(buckets[6].dateKey, '2026-11-20');
  assert.equal(buckets[6].count, 0);

  const filteredToday = filterRemindersByDay(customPool, '2026-11-14');
  assert.equal(filteredToday.length, 2);
  assert.deepEqual(
    filteredToday.map((c) => c.id),
    ['d1', 'd0'],
  );

  const allReminders = filterRemindersByDay(customPool, null);
  assert.equal(allReminders.length, 4);
});

test('normalizeClientRecord sanitizes partial imported payloads and WhatsApp handles +39/0039 prefixes', () => {
  const waPlus39 = buildWhatsAppUrl('+39 339-123-4567', 'Marco Rossi');
  assert.ok(waPlus39.startsWith('https://wa.me/393391234567?text='));

  const wa0039 = buildWhatsAppUrl('0039 339 123 4567', 'Marco Rossi');
  assert.ok(wa0039.startsWith('https://wa.me/393391234567?text='));

  assert.equal(isValidClient({ id: '', name: 'Test', phone: '3391234567', role: 'Acquirente', status: 'In corso' }), false);
  assert.equal(isValidClient({ id: 1, name: '   ', phone: '3391234567', role: 'Acquirente', status: 'In corso' }), false);
  assert.equal(isValidClient({ id: 1, name: 'Test', phone: '3391234567', role: 'Acquirente', status: 'In corso' }), true);

  const normalized = normalizeClientRecord({
    id: 42 as unknown as string,
    name: '  Elena Verdi  ',
    phone: ' 3391112223 ',
    role: 'Venditore',
    status: 'In corso',
    price: Number.NaN,
    sqm: -10,
    condoFees: 'not-a-number' as unknown as number,
    email: undefined as unknown as string,
    propertyType: '',
    zone: '',
    address: '',
    rooms: '',
    floor: '',
    hasElevator: false,
    hasBalcony: false,
    hasGarage: false,
    reminderDate: '',
    note: '  Richiamare dopo le 18  ',
    notes: '',
    photoBase64: '',
    photos: [],
  });
  assert.equal(normalized.id, '42');
  assert.equal(normalized.name, 'Elena Verdi');
  assert.equal(normalized.phone, '3391112223');
  assert.equal(normalized.propertyType, 'Appartamento');
  assert.equal(normalized.price, 0);
  assert.equal(normalized.sqm, 0);
  assert.equal(normalized.condoFees, 0);
  assert.equal(normalized.email, '');
  assert.equal(normalized.note, 'Richiamare dopo le 18');
  assert.equal(normalized.notes, 'Richiamare dopo le 18');
  assert.equal(normalized.isFavorite, false);
  assert.equal(getClientNote({ note: '', notes: 'Nota legacy' }), 'Nota legacy');
  assert.equal(getClientNote({ note: 'Nota nuova', notes: 'Nota legacy' }), 'Nota nuova');
});

test('toggleClientFavorite and favoritesOnly filter work cleanly', () => {
  const demo = generateDemoClients(4, new Date('2026-11-14T10:00:00Z').getTime());
  assert.equal(demo.every((c) => c.isFavorite === false), true);

  const starred = toggleClientFavorite(demo, 'demo-2');
  assert.equal(starred[1].isFavorite, true);
  assert.equal(starred[0].isFavorite, false);

  const onlyFavs = filterAndSortClients(starred, {
    query: '',
    status: 'ALL',
    role: 'ALL',
    sortBy: 'default',
    favoritesOnly: true,
  });
  assert.equal(onlyFavs.length, 1);
  assert.equal(onlyFavs[0].id, 'demo-2');

  const unstarred = toggleClientFavorite(starred, 'demo-2');
  assert.equal(unstarred[1].isFavorite, false);
});

test('tags normalization, editing helpers, validation, filtering, and CSV export work accurately', () => {
  assert.deepEqual(
    normalizeTags(['  investimento  ', 'Vista Mare', 'investimento', '', '   ristrutturato  ']),
    ['investimento', 'Vista Mare', 'ristrutturato'],
  );

  const added = addTagToList(['investimento'], 'vista mare, ristrutturato, Investimento');
  assert.deepEqual(added, ['investimento', 'vista mare', 'ristrutturato']);

  const removed = removeTagFromList(added, 'VISTA MARE');
  assert.deepEqual(removed, ['investimento', 'ristrutturato']);

  assert.equal(
    isValidClient({
      id: '1',
      name: 'Test',
      phone: '3391234567',
      role: 'Acquirente',
      status: 'In corso',
      tags: ['investimento'],
    }),
    true,
  );
  assert.equal(
    isValidClient({
      id: '1',
      name: 'Test',
      phone: '3391234567',
      role: 'Acquirente',
      status: 'In corso',
      tags: [123],
    }),
    false,
  );

  const demo = generateDemoClients(5, new Date('2026-11-14T10:00:00Z').getTime());
  assert.ok(Array.isArray(demo[0].tags) && demo[0].tags.length > 0);
  const available = getAvailableTags(demo);
  assert.ok(available.includes('investimento'));
  assert.ok(available.includes('vista mare'));

  const byTagFilter = filterAndSortClients(demo, {
    query: '',
    status: 'ALL',
    role: 'ALL',
    tag: 'vista mare',
    sortBy: 'default',
  });
  assert.equal(byTagFilter.length, 1);
  assert.equal(byTagFilter[0].id, 'demo-3');

  const byTagSearch = filterAndSortClients(demo, {
    query: 'ristrutturato',
    status: 'ALL',
    role: 'ALL',
    tag: 'ALL',
    sortBy: 'default',
  });
  assert.equal(byTagSearch.length, 1);
  assert.equal(byTagSearch[0].id, 'demo-2');

  const csv = generateCsvContent(demo);
  assert.ok(csv.includes('"Etichette"'));
  assert.ok(csv.includes('"ristrutturato, investimento"'));
});

test('history normalization, latest interaction lookup, and validation work accurately', () => {
  const normalized = normalizeHistory([
    { id: 'h1', date: '2026-11-10T09:00', type: 'Email', note: 'Inviata brochure' },
    { id: 'h2', date: '2026-11-14T16:30', type: 'Visita', note: 'Visita effettuata' },
    { id: 'h3', date: '2026-11-12T11:15', type: 'Sconosciuto', note: 'Nota generica' },
  ]);

  assert.equal(normalized.length, 3);
  assert.equal(normalized[0].id, 'h2');
  assert.equal(normalized[0].type, 'Visita');
  assert.equal(normalized[1].id, 'h3');
  assert.equal(normalized[1].type, 'Nota');
  assert.equal(normalized[2].id, 'h1');

  const latest = getLatestInteraction({ history: normalized });
  assert.ok(latest);
  assert.equal(latest.id, 'h2');
  assert.equal(latest.note, 'Visita effettuata');
  assert.equal(getLatestInteraction({ history: [] }), null);

  assert.equal(
    isValidClient({
      id: '1',
      name: 'Test',
      phone: '3391234567',
      role: 'Acquirente',
      status: 'In corso',
      history: [{ id: 'a1', date: '2026-11-14', type: 'Chiamata', note: 'OK' }],
    }),
    true,
  );
  assert.equal(
    isValidClient({
      id: '1',
      name: 'Test',
      phone: '3391234567',
      role: 'Acquirente',
      status: 'In corso',
      history: ['invalid-entry'],
    }),
    false,
  );

  const demo = generateDemoClients(2, new Date('2026-11-14T10:00:00Z').getTime());
  assert.ok(Array.isArray(demo[0].history) && demo[0].history.length >= 2);
  assert.ok(getLatestInteraction(demo[0]));
});

test('agency annual plan permissions, agency codes, and idempotent client sync helpers work cleanly', () => {
  assert.equal(getClientLimit('agency'), Infinity);
  assert.equal(canUseWhatsAppAndMap('agency'), true);
  assert.equal(canUseAgencySync('free'), false);
  assert.equal(canUseAgencySync('pro'), false);
  assert.equal(canUseAgencySync('agency'), true);

  assert.equal(
    getActivePlan(
      {
        name: 'Studio Rossi',
        email: 'team@rossi.it',
        password: 'secret',
        plan: 'agency',
        paymentMethod: 'PayPal',
        activatedAt: '2026-11-14T10:00:00Z',
      },
      Date.parse('2026-11-15T10:00:00Z'),
    ),
    'agency',
  );

  assert.equal(normalizeAgencyCode('  rossi & co / 2026! '), 'ROSSI-CO-2026');
  const gen = generateAgencyCode('Immobiliare Rossi');
  assert.match(gen, /^IMMOBILIARE-[A-Z0-9]{4}$/);

  const base = generateDemoClients(2, new Date('2026-11-14T10:00:00Z').getTime());
  const added = applyUpsertClientSync(base, {
    ...base[0],
    id: 'remote-99',
    name: 'Giulia Team',
  });
  assert.equal(added.length, 3);
  assert.equal(added[0].id, 'remote-99');

  // Re-applying upsert with updated field updates in-place without duplicating
  const updated = applyUpsertClientSync(added, {
    ...added[0],
    price: 410000,
  });
  assert.equal(updated.length, 3);
  assert.equal(updated[0].price, 410000);

  const afterDelete = applyDeleteClientSync(updated, 'remote-99');
  assert.equal(afterDelete.length, 2);
  // Deleting again is idempotent and returns same reference
  assert.equal(applyDeleteClientSync(afterDelete, 'remote-99'), afterDelete);
});

test('parseBudgetBound and budget range + attached photos filters work accurately', () => {
  assert.equal(parseBudgetBound(''), null);
  assert.equal(parseBudgetBound('   '), null);
  assert.equal(parseBudgetBound('-500'), null);
  assert.equal(parseBudgetBound('abc'), null);
  assert.equal(parseBudgetBound('0'), 0);
  assert.equal(parseBudgetBound(' 250000 '), 250000);

  const sampleImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const base = generateDemoClients(4, new Date('2026-11-14T10:00:00Z').getTime());
  const pool = [
    { ...base[0], price: 320000, photos: [sampleImg], photoBase64: sampleImg },
    { ...base[1], price: 295000, photos: [], photoBase64: '' },
    { ...base[2], price: 1600, photos: [], photoBase64: sampleImg }, // legacy photoBase64
    { ...base[3], price: 170000, photos: [], photoBase64: '' },
  ];

  const range150to300 = filterAndSortClients(pool, {
    query: '',
    status: 'ALL',
    role: 'ALL',
    sortBy: 'default',
    minPrice: 150000,
    maxPrice: 300000,
  });
  assert.deepEqual(
    range150to300.map((c) => c.id),
    ['demo-2', 'demo-4'],
  );

  const minOnly = filterAndSortClients(pool, {
    query: '',
    status: 'ALL',
    role: 'ALL',
    sortBy: 'default',
    minPrice: 300000,
    maxPrice: null,
  });
  assert.deepEqual(
    minOnly.map((c) => c.id),
    ['demo-1'],
  );

  const maxOnly = filterAndSortClients(pool, {
    query: '',
    status: 'ALL',
    role: 'ALL',
    sortBy: 'default',
    minPrice: null,
    maxPrice: 5000,
  });
  assert.deepEqual(
    maxOnly.map((c) => c.id),
    ['demo-3'],
  );

  const photosOnly = filterAndSortClients(pool, {
    query: '',
    status: 'ALL',
    role: 'ALL',
    sortBy: 'default',
    withPhotosOnly: true,
  });
  assert.deepEqual(
    photosOnly.map((c) => c.id),
    ['demo-1', 'demo-3'],
  );

  const combined = filterAndSortClients(pool, {
    query: '',
    status: 'ALL',
    role: 'ALL',
    sortBy: 'default',
    minPrice: 200000,
    maxPrice: 350000,
    withPhotosOnly: true,
  });
  assert.deepEqual(
    combined.map((c) => c.id),
    ['demo-1'],
  );
});

test('subscription lifecycle computes expiry, triggers 5-day pre-expiry warning, and downgrades expired plans to Free', () => {
  const DAY_MS = 86_400_000;
  const nowMs = Date.parse('2026-11-15T12:00:00Z');

  // Monthly Pro (30 days) and Annual Agency (365 days)
  const monthlyExpiry = computeSubscriptionExpiry(nowMs, 'pro', 'monthly');
  assert.equal(Date.parse(monthlyExpiry), nowMs + 30 * DAY_MS);

  const annualProExpiry = computeSubscriptionExpiry(nowMs, 'pro', 'annual');
  assert.equal(Date.parse(annualProExpiry), nowMs + 365 * DAY_MS);

  const agencyExpiry = computeSubscriptionExpiry(nowMs, 'agency', 'monthly'); // forced annual for agency
  assert.equal(Date.parse(agencyExpiry), nowMs + 365 * DAY_MS);

  // Early renewal stacks on top of remaining days instead of forfeiting them
  const twoDaysLeftIso = new Date(nowMs + 2 * DAY_MS).toISOString();
  const renewedIso = computeSubscriptionExpiry(nowMs, 'pro', 'monthly', twoDaysLeftIso);
  assert.equal(Date.parse(renewedIso), nowMs + 32 * DAY_MS);

  assert.equal(SUBSCRIPTION_WARNING_DAYS, 5);

  // Active (> 5 days remaining)
  const activeProUser = {
    name: 'Mario',
    email: 'mario@agenzia.it',
    password: 'pwd',
    plan: 'pro' as const,
    billingCycle: 'monthly' as const,
    paymentMethod: 'PayPal',
    activatedAt: new Date(nowMs - 10 * DAY_MS).toISOString(),
    expiresAt: new Date(nowMs + 10 * DAY_MS).toISOString(),
  };
  const activeStatus = evaluateSubscriptionStatus(activeProUser, nowMs);
  assert.equal(activeStatus.phase, 'active');
  assert.equal(activeStatus.plan, 'pro');
  assert.equal(activeStatus.daysRemaining, 10);

  // Warning window at exactly 5 days remaining and 1 day remaining
  const fiveDaysLeftUser = {
    ...activeProUser,
    expiresAt: new Date(nowMs + 5 * DAY_MS).toISOString(),
  };
  const warn5 = evaluateSubscriptionStatus(fiveDaysLeftUser, nowMs);
  assert.equal(warn5.phase, 'expiring_soon');
  assert.equal(warn5.plan, 'pro');
  assert.equal(warn5.daysRemaining, 5);

  const lessThanOneDayUser = {
    ...activeProUser,
    expiresAt: new Date(nowMs + 6 * 3600_000).toISOString(),
  };
  const warn1 = evaluateSubscriptionStatus(lessThanOneDayUser, nowMs);
  assert.equal(warn1.phase, 'expiring_soon');
  assert.equal(warn1.daysRemaining, 1);

  // Expired paid plan reverts to Free via reconcileExpiredSubscription
  const expiredAgencyUser = {
    name: 'Agenzia Nord',
    email: 'team@nord.it',
    password: 'pwd',
    plan: 'agency' as const,
    billingCycle: 'annual' as const,
    paymentMethod: 'Carta di Credito/Debito',
    activatedAt: new Date(nowMs - 370 * DAY_MS).toISOString(),
    expiresAt: new Date(nowMs - 3600_000).toISOString(),
  };

  assert.equal(getActivePlan(expiredAgencyUser, nowMs), 'free');
  const reconciled = reconcileExpiredSubscription(expiredAgencyUser, nowMs);
  assert.equal(reconciled.downgradedFrom, 'agency');
  assert.equal(reconciled.user.plan, 'free');
  assert.equal(reconciled.user.expiredFromPlan, 'agency');
  assert.equal(reconciled.user.expiredAt, new Date(nowMs).toISOString());

  // Already reconciled Free user retains 'expired' phase while expiredFromPlan is set
  const postDowngradeStatus = evaluateSubscriptionStatus(reconciled.user, nowMs);
  assert.equal(postDowngradeStatus.phase, 'expired');
  assert.equal(postDowngradeStatus.plan, 'free');
  assert.equal(postDowngradeStatus.expiredFromPlan, 'agency');

  // Re-running reconcile on already-free user is a no-op
  const secondPass = reconcileExpiredSubscription(reconciled.user, nowMs);
  assert.equal(secondPass.downgradedFrom, null);

  // Legacy account without expiresAt infers expiry from activatedAt
  const legacyExpired = {
    name: 'Legacy Expired',
    email: 'legacy-exp@agenzia.it',
    password: 'pwd',
    plan: 'pro' as const,
    paymentMethod: 'PayPal',
    activatedAt: new Date(nowMs - 40 * DAY_MS).toISOString(),
  };
  assert.equal(evaluateSubscriptionStatus(legacyExpired, nowMs).phase, 'expired');
  assert.equal(getActivePlan(legacyExpired, nowMs), 'free');

  assert.equal(getSubscriptionPlanLabel('pro', 'monthly'), 'Singolo Pro (Mensile)');
  assert.equal(getSubscriptionPlanLabel('pro', 'annual'), 'Singolo Pro (Annuale)');
  assert.equal(getSubscriptionPlanLabel('agency', 'annual'), 'Agenzia / Team (Annuale)');
});

test('Stripe ?pagato=mensile / ?pagato=true / ?pagato=annuale / ?pagato=pro redirect helpers activate plans safely and strip URL query param', () => {
  assert.equal(parsePaidRedirectParam('?pagato=mensile'), 'monthly_1490');
  assert.equal(parsePaidRedirectParam('?pagato=true'), 'monthly_1490');
  assert.equal(parsePaidRedirectParam('?foo=1&pagato=annuale&bar=2'), 'annual_99');
  assert.equal(parsePaidRedirectParam('?foo=1&pagato=pro&bar=2'), 'pro_149');
  assert.equal(parsePaidRedirectParam('?pagato=false'), null);
  assert.equal(parsePaidRedirectParam(''), null);

  assert.equal(hasPaidRedirectParam('?pagato=true'), true);
  assert.equal(hasPaidRedirectParam('?pagato=mensile'), true);
  assert.equal(hasPaidRedirectParam('?pagato=annuale'), true);
  assert.equal(hasPaidRedirectParam('?pagato=pro'), true);
  assert.equal(hasPaidRedirectParam('?pagato=false'), false);
  assert.equal(hasPaidRedirectParam(''), false);

  assert.equal(stripPaidRedirectParam('https://example.com/?pagato=true'), '/');
  assert.equal(stripPaidRedirectParam('https://example.com/?pagato=mensile'), '/');
  assert.equal(stripPaidRedirectParam('https://example.com/?pagato=annuale'), '/');
  assert.equal(stripPaidRedirectParam('https://example.com/crm?foo=1&pagato=pro#top'), '/crm?foo=1#top');

  const nowMs = Date.parse('2026-11-16T10:00:00Z');
  // 1) Guest ?pagato=mensile / ?pagato=true activates Piano Mensile (€ 14,90/mese -> plan 'pro', cycle 'monthly')
  const guestMonthlyResult = applyStripeProActivation([], null, nowMs);
  assert.equal(guestMonthlyResult.sessionEmail, STRIPE_MONTHLY_FALLBACK_EMAIL);
  assert.equal(guestMonthlyResult.activatedUser.plan, 'pro');
  assert.equal(guestMonthlyResult.activatedUser.billingCycle, 'monthly');
  assert.equal(guestMonthlyResult.activatedUser.paymentMethod, 'Stripe');
  assert.equal(guestMonthlyResult.accounts.length, 1);
  assert.equal(getActivePlan(guestMonthlyResult.activatedUser, nowMs), 'pro');

  // StrictMode idempotent double invocation within 60s does not extend expiry twice
  const secondGuestPass = applyStripeProActivation(
    guestMonthlyResult.accounts,
    guestMonthlyResult.sessionEmail,
    nowMs + 100,
  );
  assert.equal(secondGuestPass.activatedUser.expiresAt, guestMonthlyResult.activatedUser.expiresAt);

  // Upgrading from ?pagato=mensile to ?pagato=annuale updates cycle to 'annual' (99 €/anno)
  const upgradedToAnnual99 = applyStripePlanActivation(
    guestMonthlyResult.accounts,
    guestMonthlyResult.sessionEmail,
    'annual_99',
    nowMs + 150,
  );
  assert.equal(upgradedToAnnual99.activatedUser.plan, 'pro');
  assert.equal(upgradedToAnnual99.activatedUser.billingCycle, 'annual');

  // 2) Guest ?pagato=annuale directly creates fallback € 99/anno account cleanly
  const guestAnnualResult = applyStripePlanActivation([], null, 'annual_99', nowMs);
  assert.equal(guestAnnualResult.sessionEmail, STRIPE_ANNUAL_FALLBACK_EMAIL);
  assert.equal(guestAnnualResult.activatedUser.plan, 'pro');
  assert.equal(guestAnnualResult.activatedUser.billingCycle, 'annual');
  assert.equal(getActivePlan(guestAnnualResult.activatedUser, nowMs), 'pro');

  // 3) Guest ?pagato=pro directly creates fallback Pro Licenza (€ 149) account cleanly
  const guestProResult = applyStripePlanActivation([], null, 'pro_149', nowMs);
  assert.equal(guestProResult.sessionEmail, STRIPE_PRO_FALLBACK_EMAIL);
  assert.equal(guestProResult.activatedUser.plan, 'agency');
  assert.equal(guestProResult.activatedUser.billingCycle, 'annual');
  assert.equal(getActivePlan(guestProResult.activatedUser, nowMs), 'agency');

  // Logged-in Free user gets upgraded in-place keeping their email & name
  const loggedInFree = [
    {
      name: 'Elena Neri',
      email: 'elena@immobiliare.it',
      password: 'pwd',
      plan: 'free' as const,
      paymentMethod: '',
      activatedAt: '',
      expiredFromPlan: 'pro' as const,
    },
  ];
  const upgraded = applyStripePlanActivation(loggedInFree, 'elena@immobiliare.it', 'annual_99', nowMs);
  assert.equal(upgraded.sessionEmail, 'elena@immobiliare.it');
  assert.equal(upgraded.activatedUser.name, 'Elena Neri');
  assert.equal(upgraded.activatedUser.plan, 'pro');
  assert.equal(upgraded.activatedUser.billingCycle, 'annual');
  assert.equal(upgraded.activatedUser.expiredFromPlan, undefined);
});

test('license code validation and local Pro/Agency unlock work cleanly', () => {
  const emptyCheck = validateLicenseCode('   ', 'it');
  assert.equal(emptyCheck.valid, false);

  const invalidShort = validateLicenseCode('123', 'en');
  assert.equal(invalidShort.valid, false);

  const validCompact = validateLicenseCode('immopulse2026', 'it');
  assert.equal(validCompact.valid, true);
  if (validCompact.valid) {
    assert.equal(validCompact.normalizedCode, 'IMMOPULSE2026');
    assert.equal(validCompact.plan, 'pro');
    assert.equal(validCompact.billingCycle, 'annual');
  }

  const validPro = validateLicenseCode(' immo-pro-2026 ', 'it');
  assert.equal(validPro.valid, true);
  if (validPro.valid) {
    assert.equal(validPro.normalizedCode, 'IMMO-PRO-2026');
    assert.equal(validPro.plan, 'pro');
    assert.equal(validPro.billingCycle, 'annual');
  }

  const validAgency = validateLicenseCode('IMMO-AGENZIA-99', 'it');
  assert.equal(validAgency.valid, true);
  if (validAgency.valid) {
    assert.equal(validAgency.plan, 'agency');
  }

  const nowMs = Date.parse('2026-11-16T12:00:00Z');
  const guestUnlock = applyLicenseCodeActivation([], null, 'IMMO-PRO-2026', nowMs, 'it');
  assert.equal(guestUnlock.ok, true);
  if (guestUnlock.ok) {
    assert.equal(guestUnlock.sessionEmail, LICENSE_FALLBACK_EMAIL);
    assert.equal(guestUnlock.activatedUser.plan, 'pro');
    assert.equal(guestUnlock.activatedUser.licenseCode, 'IMMO-PRO-2026');
    assert.equal(getActivePlan(guestUnlock.activatedUser, nowMs), 'pro');
  }
});

test('?payment=success / &payment=success activates Pro immediately and persists immopulse_pro_active', () => {
  assert.equal(hasPaymentSuccessParam('?payment=success'), true);
  assert.equal(hasPaymentSuccessParam('?session_id=cs_123&payment=success'), true);
  assert.equal(hasPaymentSuccessParam('?payment=failed'), false);
  assert.equal(hasPaymentSuccessParam(''), false);

  assert.equal(stripPaidRedirectParam('https://immopulse.local/?payment=success'), '/');
  assert.equal(stripPaidRedirectParam('https://immopulse.local/crm?foo=1&payment=success'), '/crm?foo=1');

  const nowMs = Date.parse('2026-11-16T12:30:00Z');
  const res = applyPaymentSuccessActivation([], null, nowMs);
  assert.equal(res.sessionEmail, PAYMENT_SUCCESS_FALLBACK_EMAIL);
  assert.equal(res.activatedUser.plan, 'pro');
  assert.equal(res.activatedUser.paymentMethod, 'Stripe');
  assert.equal(res.activatedAt, '2026-11-16T12:30:00.000Z');
  assert.equal(getActivePlan(res.activatedUser, nowMs), 'pro');
  assert.equal(canUseWhatsAppAndMap(res.activatedUser.plan), true);
  assert.equal(getClientLimit(res.activatedUser.plan), Infinity);

  clearProActiveFlag();
  assert.equal(loadProActiveFlag().active, false);
  assert.equal(saveProActiveFlag(res.activatedAt), true);
  const loadedFlag = loadProActiveFlag();
  assert.equal(loadedFlag.active, true);
  assert.equal(loadedFlag.activatedAt, res.activatedAt);
  clearProActiveFlag();
});






