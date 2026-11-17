import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCustomFeatureLabel,
  addPortalToList,
  buildDirectPortalSearchUrl,
  buildGooglePortalQuickSearchUrl,
  buildIdealistaDirectUrl,
  buildIdealistaProvinciaUrl,
  buildPortalVerificationUrl,
  buildRadarPortalUrls,
  buildSearchQueryWithFilters,
  buildSimplePortalQuery,
  cloneDefaultPortals,
  extractClientCityAndZone,
  extractPortalHostname,
  hasActivePortalFilters,
  normalizeCitySlug,
  normalizeCustomFeatures,
  normalizePortalUrl,
  parseRoomsCount,
  removePortalFromList,
  resolvePortalCitySlug,
  sanitizePortalsList,
  toggleCustomFeature,
  togglePortalEnabled,
  updatePortalInList,
} from './portalSearch.ts';

test('cloneDefaultPortals provides 4 Italian property portals by default', () => {
  const portals = cloneDefaultPortals();
  assert.equal(portals.length, 4);
  assert.deepEqual(
    portals.map((p) => extractPortalHostname(p.url)),
    ['immobiliare.it', 'idealista.it', 'subito.it', 'casa.it'],
  );
});

test('normalizePortalUrl adds https and validates hostnames', () => {
  assert.equal(normalizePortalUrl('tecnocasa.it/'), 'https://tecnocasa.it');
  assert.equal(normalizePortalUrl('https://www.immobiliare.it/'), 'https://www.immobiliare.it');
  assert.equal(normalizePortalUrl('invalidhost'), null);
  assert.equal(normalizePortalUrl('ftp://immobiliare.it'), null);
});

test('updatePortalInList lets users replace any of the 4 portal links directly', () => {
  const initial = cloneDefaultPortals();
  const slotId = initial[2].id;
  const updated = updatePortalInList(initial, slotId, 'https://www.wikicasa.it', 'Wikicasa');
  assert.equal(updated.error, undefined);
  assert.equal(updated.portals.length, 4);
  assert.equal(updated.portals[2].name, 'Wikicasa');
  assert.equal(updated.portals[2].url, 'https://www.wikicasa.it');
});

test('addPortalToList prevents duplicates and adds custom portals cleanly', () => {
  const initial = cloneDefaultPortals();
  const duplicate = addPortalToList(initial, 'https://www.immobiliare.it');
  assert.ok(duplicate.error);
  assert.equal(duplicate.portals.length, initial.length);

  const added = addPortalToList(initial, 'tecnocasa.it', 'Tecnocasa');
  assert.equal(added.error, undefined);
  assert.equal(added.portals.length, initial.length + 1);
  assert.equal(added.added?.name, 'Tecnocasa');
  assert.equal(added.added?.url, 'https://tecnocasa.it');
  assert.equal(added.added?.enabled, true);
  assert.equal(added.added?.isCustom, true);
});

test('togglePortalEnabled and removePortalFromList update state safely', () => {
  const initial = cloneDefaultPortals();
  const firstId = initial[0].id;
  const toggled = togglePortalEnabled(initial, firstId);
  assert.equal(toggled[0].enabled, false);

  const removed = removePortalFromList(toggled, firstId);
  assert.equal(removed.length, initial.length - 1);
});

test('buildSearchQueryWithFilters and buildPortalVerificationUrl combine unified search + filters', () => {
  const filters = {
    contract: 'vendita' as const,
    propertyType: 'Appartamento',
    cityZone: 'Milano Isola',
    minPrice: '200000',
    maxPrice: '380000',
    minSqm: '80',
    minRooms: '3',
  };
  assert.equal(hasActivePortalFilters(filters), true);

  const combined = buildSearchQueryWithFilters('balcone luminoso', filters);
  assert.ok(combined.includes('balcone luminoso'));
  assert.ok(combined.includes('in vendita'));
  assert.ok(combined.includes('Appartamento'));
  assert.ok(combined.includes('Milano Isola'));
  assert.ok(combined.includes('3+ locali'));
  assert.ok(combined.includes('da 80 mq'));
  assert.ok(combined.includes('prezzo da 200000 a 380000 euro'));

  const portal = cloneDefaultPortals()[0];
  const href = buildPortalVerificationUrl(portal, 'balcone luminoso', filters);
  assert.ok(href.startsWith('https://www.google.com/search?q='));
  assert.ok(decodeURIComponent(href).includes('site:immobiliare.it'));
  assert.ok(decodeURIComponent(href).includes('Milano Isola'));
});

test('sanitizePortalsList falls back to defaults for corrupted values', () => {
  assert.equal(sanitizePortalsList(null).length, 4);
  assert.equal(sanitizePortalsList([{ id: 'bad', url: 'not-a-domain' }]).length, 4);
});

test('customizable property filters normalize, toggle, add, and route contract-specific Subito URLs', () => {
  assert.deepEqual(
    normalizeCustomFeatures(['  Terrazzo ', 'terrazzo', 'Vicino Metro', '']),
    ['Terrazzo', 'Vicino Metro'],
  );

  const added = addCustomFeatureLabel(['Terrazzo'], 'Doppi servizi');
  assert.equal(added.added, 'Doppi servizi');
  assert.deepEqual(added.next, ['Terrazzo', 'Doppi servizi']);

  const toggledOff = toggleCustomFeature(added.next, 'terrazzo');
  assert.deepEqual(toggledOff, ['Doppi servizi']);

  const filters = {
    contract: 'affitto' as const,
    propertyType: 'Appartamento',
    cityZone: 'Torino Crocetta',
    customFeatures: ['Arredato', 'Vicino Metro'],
  };
  assert.equal(hasActivePortalFilters({ customFeatures: ['Vicino Metro'] }), true);

  const combined = buildSearchQueryWithFilters('bilocale', filters);
  assert.ok(combined.includes('in affitto'));
  assert.ok(combined.includes('Arredato Vicino Metro'));

  const subitoPortal = cloneDefaultPortals().find((p) => extractPortalHostname(p.url) === 'subito.it')!;
  const subitoRentUrl = buildPortalVerificationUrl(subitoPortal, 'bilocale', filters);
  assert.ok(subitoRentUrl.startsWith('https://www.subito.it/annunci-italia/affitto/immobili/?'));

  const subitoAllUrl = buildPortalVerificationUrl(subitoPortal, 'bilocale', { contract: 'tutti' });
  assert.ok(subitoAllUrl.startsWith('https://www.subito.it/annunci-italia/immobili/?'));
});

test('normalizeCitySlug, buildDirectPortalSearchUrl, and buildGooglePortalQuickSearchUrl generate anti-404 links for all 4 portals', () => {
  assert.equal(normalizeCitySlug('Milano'), 'milano');
  assert.equal(normalizeCitySlug('Sesto San Giovanni'), 'sesto-san-giovanni');
  assert.equal(normalizeCitySlug('Forlì'), 'forli');

  const portals = cloneDefaultPortals();
  const [immobiliare, idealista, subito, casa] = portals;

  const saleInput = {
    query: 'Trilocale vendita Milano 300000',
    contract: 'vendita' as const,
    cityZone: 'Milano',
    maxPrice: '300000',
  };

  const summary = buildSimplePortalQuery(saleInput);
  assert.equal(summary, 'vendita Milano Trilocale fino a 300000 euro');

  // 1. Immobiliare.it
  const immSaleUrl = buildDirectPortalSearchUrl(immobiliare, saleInput);
  assert.equal(immSaleUrl, 'https://www.immobiliare.it/vendita-case/milano/?prezzoMassimo=300000');

  const immNoCityUrl = buildDirectPortalSearchUrl(immobiliare, {
    query: 'Trilocale',
    contract: 'vendita',
    cityZone: '',
    maxPrice: '300000',
  });
  assert.equal(immNoCityUrl, 'https://www.immobiliare.it/');

  // 2. Idealista.it (direct official Idealista URLs: province capitals get -provincia, other municipalities do not)
  assert.equal(
    buildDirectPortalSearchUrl(idealista, {
      query: 'Trilocale',
      contract: 'vendita',
      cityZone: 'Milano',
      maxPrice: '350000',
    }),
    'https://www.idealista.it/vendita-case/milano-provincia/con-prezzo_350000/',
  );
  assert.equal(
    buildDirectPortalSearchUrl(idealista, {
      query: '',
      contract: 'affitto',
      cityZone: 'Monza',
      maxPrice: '1200',
    }),
    'https://www.idealista.it/affitto-case/monza-provincia/con-prezzo_1200/',
  );
  assert.equal(
    buildDirectPortalSearchUrl(idealista, {
      query: '',
      contract: 'vendita',
      cityZone: 'Sesto San Giovanni',
      maxPrice: '300000',
    }),
    'https://www.idealista.it/vendita-case/sesto-san-giovanni/con-prezzo_300000/',
  );
  assert.equal(
    buildDirectPortalSearchUrl(idealista, {
      query: '',
      contract: 'affitto',
      cityZone: 'Cinisello Balsamo',
      maxPrice: '',
    }),
    'https://www.idealista.it/affitto-case/cinisello-balsamo/',
  );
  assert.equal(
    buildIdealistaDirectUrl({
      query: 'Trilocale',
      contract: 'vendita',
      cityZone: '',
      maxPrice: '350000',
    }),
    'https://www.idealista.it/',
  );
  assert.equal(
    buildIdealistaProvinciaUrl({
      query: '',
      contract: 'vendita',
      cityZone: 'Seregno',
      maxPrice: '0',
    }),
    'https://www.idealista.it/vendita-case/seregno/',
  );

  // Idealista Quick Google Results remains site:idealista.it on Google
  const ideGoogleUrl = buildGooglePortalQuickSearchUrl(idealista, saleInput);
  assert.ok(ideGoogleUrl.startsWith('https://www.google.com/search?q='));
  assert.ok(
    new URL(ideGoogleUrl).searchParams.get('q')?.includes('site:idealista.it vendita Milano Trilocale'),
  );

  // 3. Subito.it
  const subSaleUrl = buildDirectPortalSearchUrl(subito, saleInput);
  assert.ok(subSaleUrl.startsWith('https://www.subito.it/annunci-italia/vendita/immobili/?'));
  assert.equal(new URL(subSaleUrl).searchParams.get('q'), 'Milano Trilocale');

  // 4. Casa.it
  const casaSaleUrl = buildDirectPortalSearchUrl(casa, {
    query: 'Trilocale',
    contract: 'vendita',
    cityZone: 'Sesto San Giovanni',
    maxPrice: '',
  });
  assert.equal(casaSaleUrl, 'https://www.casa.it/vendita/residenziale/sesto-san-giovanni/');

  // Rent mode across all portals
  const rentInput = {
    query: 'Bilocale',
    contract: 'affitto' as const,
    cityZone: 'Monza',
    maxPrice: '1100',
  };

  assert.equal(
    buildDirectPortalSearchUrl(immobiliare, rentInput),
    'https://www.immobiliare.it/affitto-case/monza/?prezzoMassimo=1100',
  );
  assert.ok(
    buildDirectPortalSearchUrl(subito, rentInput).startsWith(
      'https://www.subito.it/annunci-italia/affitto/immobili/?',
    ),
  );
  assert.equal(
    buildDirectPortalSearchUrl(casa, rentInput),
    'https://www.casa.it/affitto/residenziale/monza/?priceMax=1100',
  );

  // 5. Quick Google Results button across all 4 cards
  const googleUrl = buildGooglePortalQuickSearchUrl(immobiliare, rentInput);
  assert.ok(googleUrl.startsWith('https://www.google.com/search?q='));
  assert.equal(
    new URL(googleUrl).searchParams.get('q'),
    'site:immobiliare.it affitto Monza Bilocale fino a 1100 euro',
  );
});

test('smart main-bar parsing and neighborhood city extraction prevent 404 URLs across all 4 portals', () => {
  const [immobiliare, idealista, subito, casa] = cloneDefaultPortals();

  // Case A: User types only in the main search bar leaving City/Zone and Max Price empty
  const freeTextSale = {
    query: 'Trilocale Milano Navigli 300000',
    contract: 'vendita' as const,
    cityZone: '',
    maxPrice: '',
  };
  assert.equal(
    buildDirectPortalSearchUrl(immobiliare, freeTextSale),
    'https://www.immobiliare.it/vendita-case/milano/?prezzoMassimo=300000',
  );
  assert.equal(
    buildDirectPortalSearchUrl(idealista, freeTextSale),
    'https://www.idealista.it/vendita-case/milano-provincia/con-prezzo_300000/',
  );
  assert.equal(
    buildDirectPortalSearchUrl(casa, freeTextSale),
    'https://www.casa.it/vendita/residenziale/milano/?priceMax=300000',
  );
  const subFreeUrl = new URL(buildDirectPortalSearchUrl(subito, freeTextSale));
  assert.equal(subFreeUrl.pathname, '/annunci-italia/vendita/immobili/');
  assert.equal(subFreeUrl.searchParams.get('pe'), '300000');

  // Case B: User types rent query in main bar with default Vendita selected
  const freeTextRent = {
    query: 'Bilocale affitto Monza 1100',
    contract: 'vendita' as const,
    cityZone: '',
    maxPrice: '',
  };
  assert.equal(
    buildDirectPortalSearchUrl(immobiliare, freeTextRent),
    'https://www.immobiliare.it/affitto-case/monza/?prezzoMassimo=1100',
  );
  assert.equal(
    buildDirectPortalSearchUrl(idealista, freeTextRent),
    'https://www.idealista.it/affitto-case/monza-provincia/con-prezzo_1100/',
  );

  // Case C: Neighborhood + city resolution avoids /milano-navigli/ or /centro-storico/ 404s
  assert.equal(resolvePortalCitySlug('Milano Navigli'), 'milano');
  assert.equal(resolvePortalCitySlug('Via Roma 1, Milano'), 'milano');
  assert.equal(resolvePortalCitySlug('Sesto San Giovanni'), 'sesto-san-giovanni');

  const extracted = extractClientCityAndZone('Centro Storico', 'Via Roma 1, Milano');
  assert.equal(extracted.cityZone, 'Milano Centro Storico');
  assert.equal(
    buildDirectPortalSearchUrl(idealista, {
      query: 'Appartamento',
      contract: 'vendita',
      cityZone: extracted.cityZone,
      maxPrice: '320000',
    }),
    'https://www.idealista.it/vendita-case/milano-provincia/con-prezzo_320000/',
  );
});

test('parseRoomsCount and buildRadarPortalUrls generate complete filtered URLs for Radar and ClientCard', () => {
  assert.equal(parseRoomsCount('3 Vani'), '3');
  assert.equal(parseRoomsCount('2 locali'), '2');
  assert.equal(parseRoomsCount(''), '');

  const targets = buildRadarPortalUrls({
    city: 'Milano',
    maxPrice: '300000',
    rooms: '3',
    contract: 'vendita',
    onlyPrivate: true,
  });
  assert.equal(targets.length, 4);

  const imm = targets.find((t) => t.host === 'immobiliare.it')!;
  const ide = targets.find((t) => t.host === 'idealista.it')!;
  const cas = targets.find((t) => t.host === 'casa.it')!;
  const sub = targets.find((t) => t.host === 'subito.it')!;

  assert.ok(imm.url.includes('/vendita-case/milano/'));
  assert.ok(imm.url.includes('prezzoMassimo=300000'));
  assert.ok(imm.url.includes('localiMinimo=3'));
  assert.ok(imm.url.includes('idMZona=privati'));

  assert.equal(
    ide.url,
    'https://www.idealista.it/vendita-case/milano-provincia/con-prezzo_300000,trilocali,quadrilocali,solo-privati/?ordine=pubblicazione-desc',
  );

  assert.ok(cas.url.includes('/vendita/residenziale/milano/'));
  assert.ok(cas.url.includes('priceMax=300000'));
  assert.ok(cas.url.includes('roomsMin=3'));
  assert.ok(cas.url.includes('sellerType=private'));

  assert.ok(sub.url.includes('/vendita/appartamenti/'));
  assert.ok(sub.url.includes('pe=300000'));
  assert.ok(sub.url.includes('advt=0'));
});


