import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addTagToList,
  applyDeleteClientSync,
  applyUpsertClientSync,
  buildMapsUrl,
  buildUpcoming7DaysBuckets,
  buildWhatsAppUrl,
  canUseAgencySync,
  canUseWhatsAppAndMap,
  computeMatches,
  computeMetrics,
  encodeArg,
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
  getVisibleClientsPool,
  isValidClient,
  normalizeAgencyCode,
  normalizeClientRecord,
  normalizeHistory,
  normalizeTags,
  parseBudgetBound,
  removeTagFromList,
  toLocalDateKey,
  toggleClientFavorite,
  validateCardPayment,
  validateDigitalPayment,
} from './crmLogic';

test('encodeArg encodes apostrophes and special characters safely', () => {
  const encoded = encodeArg("Antonio D'Amico (Sant'Ambrogio)!");
  assert.equal(encoded.includes("'"), false);
  assert.equal(encoded.includes('('), false);
  assert.equal(encoded.includes(')'), false);
  assert.equal(encoded.includes('!'), false);
  assert.equal(decodeURIComponent(encoded), "Antonio D'Amico (Sant'Ambrogio)!");
});

test('plan limits and channel permissions enforce Free (3), Basic (10), and Full (Infinity)', () => {
  assert.equal(getClientLimit('free'), 3);
  assert.equal(getClientLimit('basic'), 10);
  assert.equal(getClientLimit('full'), Infinity);

  assert.equal(canUseWhatsAppAndMap('free'), false);
  assert.equal(canUseWhatsAppAndMap('basic'), true);
  assert.equal(canUseWhatsAppAndMap('full'), true);

  const demo50 = generateDemoClients(50, new Date('2026-11-14T10:00:00Z').getTime());
  assert.equal(demo50.length, 50);
  assert.equal(getVisibleClientsPool(demo50, 'free').length, 3);
  assert.equal(getVisibleClientsPool(demo50, 'basic').length, 10);
  assert.equal(getVisibleClientsPool(demo50, 'full').length, 50);
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
  assert.equal(canUseAgencySync('basic'), false);
  assert.equal(canUseAgencySync('full'), false);
  assert.equal(canUseAgencySync('agency'), true);

  assert.equal(
    getActivePlan({
      name: 'Studio Rossi',
      email: 'team@rossi.it',
      password: 'secret',
      plan: 'agency',
      paymentMethod: 'PayPal',
      activatedAt: '2026-11-14T10:00:00Z',
    }),
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





