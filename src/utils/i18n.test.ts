import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLocale,
  translateInteractionType,
  translatePortalFeature,
  translatePropertyCondition,
  translatePropertyType,
  translateRole,
  translateStatus,
  translateSuggestedTag,
} from './i18n';
import {
  LANGUAGE_KEY,
  loadSavedLanguage,
  safeStorageRemove,
  saveLanguage,
} from './storage';
import {
  LEGAL_DOC_ORDER,
  LEGAL_OWNER_NAME,
  STRIPE_ANNUAL_CHECKOUT_URL,
  STRIPE_CUSTOMER_PORTAL_URL,
  STRIPE_MONTHLY_CHECKOUT_URL,
  STRIPE_PRO_CHECKOUT_URL,
  SUPPORT_EMAIL,
  buildSupportEmailUrl,
  buildSupportWhatsAppUrl,
  getLegalDocument,
} from './legalAndSupport';
import {
  buildUpcoming7DaysBuckets,
  computeMatches,
  generateCsvContent,
  getSubscriptionPlanLabel,
} from './crmLogic';
import { buildClientPdfFilename, buildClientPdfSections } from './clientPdf';
import type { ClientRecord } from '../types/crm';

test('language storage defaults to Italian and persists English selection', () => {
  safeStorageRemove(LANGUAGE_KEY);
  assert.equal(loadSavedLanguage(), 'it');

  assert.equal(saveLanguage('en'), true);
  assert.equal(loadSavedLanguage(), 'en');

  assert.equal(saveLanguage('it'), true);
  assert.equal(loadSavedLanguage(), 'it');
});

test('i18n translators return Italian unchanged for it and accurate English for en', () => {
  assert.equal(getLocale('it'), 'it-IT');
  assert.equal(getLocale('en'), 'en-US');

  assert.equal(translateRole('Acquirente', 'it'), 'Acquirente');
  assert.equal(translateRole('Acquirente', 'en'), 'Buyer');
  assert.equal(translateRole('Venditore', 'en'), 'Seller');
  assert.equal(translateRole('Inquilino', 'en'), 'Tenant');
  assert.equal(translateRole('Locatore', 'en'), 'Landlord');

  assert.equal(translateStatus('In corso', 'it'), 'In corso');
  assert.equal(translateStatus('In corso', 'en'), 'In progress');
  assert.equal(translateStatus('Trattativa', 'en'), 'Negotiation');
  assert.equal(translateStatus('Accettato', 'en'), 'Accepted');
  assert.equal(translateStatus('Perso', 'en'), 'Lost');

  assert.equal(translatePropertyType('Attico', 'it'), 'Attico');
  assert.equal(translatePropertyType('Attico', 'en'), 'Penthouse');
  assert.equal(translatePropertyType('Locale Commerciale', 'en'), 'Commercial Unit');

  assert.equal(translateInteractionType('Chiamata', 'en'), 'Call');
  assert.equal(translateInteractionType('Visita', 'en'), 'Viewing');

  assert.equal(translateSuggestedTag('prima casa', 'en'), 'first home');
  assert.equal(translatePortalFeature('Vista mare', 'en'), 'Sea view');
  assert.equal(translatePropertyCondition('Ristrutturato', 'en'), 'Renovated');
});

test('English legal documents preserve owner, Stripe links, 149,00 € price, and support URLs', () => {
  const combinedEn = LEGAL_DOC_ORDER.map((key) => {
    const doc = getLegalDocument(key, 'en');
    return [doc.shortLabel, doc.title, doc.subtitle, ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join(
      '\n',
    );
  }).join('\n');

  assert.ok(combinedEn.includes(LEGAL_OWNER_NAME));
  assert.ok(combinedEn.includes(SUPPORT_EMAIL));
  assert.ok(combinedEn.includes('149,00 €'));
  assert.ok(combinedEn.includes('Stripe'));
  assert.ok(combinedEn.includes('Data Controller'));
  assert.ok(combinedEn.includes('Data Processor'));

  assert.equal(STRIPE_MONTHLY_CHECKOUT_URL, 'https://buy.stripe.com/eVqaEWawH6BfdXo0IZ1B606');
  assert.equal(STRIPE_ANNUAL_CHECKOUT_URL, 'https://buy.stripe.com/14A4gy8oz2kZf1s1N31B607');
  assert.equal(STRIPE_PRO_CHECKOUT_URL, 'https://buy.stripe.com/dRm28q34f6Bff1s77n1B605');
  assert.equal(
    STRIPE_CUSTOMER_PORTAL_URL,
    'https://billing.stripe.com/p/login/INSERISCI_LINK_PORTALE',
  );

  const enMail = decodeURIComponent(buildSupportEmailUrl('agent@agency.com', 'agency', 'en'));
  assert.ok(enMail.includes('Technical Support Request'));
  assert.ok(enMail.includes('Current plan: AGENCY'));

  const enWa = decodeURIComponent(buildSupportWhatsAppUrl('agent@agency.com', 'pro', 'en'));
  assert.ok(enWa.includes('technical support'));
  assert.ok(enWa.includes('Plan: PRO'));
});

test('CRM matching, CSV, 7-day buckets, plan labels, and PDF builders respect English locale', () => {
  const samplePool: ClientRecord[] = [
    {
      id: 'seller-1',
      name: 'Mario Verdi',
      phone: '3331112233',
      email: 'mario@example.com',
      role: 'Venditore',
      propertyType: 'Attico',
      zone: 'Brera',
      address: 'Via Solferino 10',
      price: 350000,
      sqm: 120,
      rooms: '4 Vani',
      floor: '5',
      condoFees: 200,
      hasElevator: true,
      hasBalcony: true,
      hasGarage: true,
      status: 'In corso',
      reminderDate: '2026-11-16T10:00',
      note: 'Ottimo attico',
      tags: ['vista mare'],
      history: [{ id: 'h1', date: '2026-11-15T09:00', type: 'Visita', note: 'Prima visita' }],
      photos: [],
      photoBase64: '',
      isFavorite: false,
    },
    {
      id: 'buyer-1',
      name: 'Laura Bianchi',
      phone: '3334445566',
      email: 'laura@example.com',
      role: 'Acquirente',
      propertyType: 'Attico',
      zone: 'Brera',
      address: '',
      price: 400000,
      sqm: 100,
      rooms: '3 Vani',
      floor: '',
      condoFees: 0,
      hasElevator: true,
      hasBalcony: false,
      hasGarage: false,
      status: 'Trattativa',
      reminderDate: '',
      note: 'Interessata',
      tags: ['prima casa'],
      history: [],
      photos: [],
      photoBase64: '',
      isFavorite: true,
    },
  ];

  assert.equal(getSubscriptionPlanLabel('agency', 'annual', 'en'), 'Agency / Team (Annual)');
  assert.equal(getSubscriptionPlanLabel('pro', 'monthly', 'en'), 'Individual Pro (Monthly)');

  const matchesEn = computeMatches(samplePool, 'seller-1', 'en');
  assert.equal(matchesEn.length, 1);
  assert.equal(matchesEn[0].score, 100);
  assert.ok(matchesEn[0].reasons.some((r) => r.includes('Matching property type (Penthouse)')));
  assert.ok(matchesEn[0].reasons.some((r) => r.includes('Compatible area (Brera)')));
  assert.ok(matchesEn[0].reasons.some((r) => r.includes('Sufficient budget')));

  const csvEn = generateCsvContent(samplePool, 'en');
  assert.ok(csvEn.includes('"Name";"Phone";"Email";"Role";"Property Type";"Area"'));

  const bucketsEn = buildUpcoming7DaysBuckets(samplePool, new Date('2026-11-16T08:00:00'), 'en');
  assert.equal(bucketsEn.length, 7);
  assert.ok(bucketsEn[0].shortLabel.startsWith('Today'));
  assert.equal(bucketsEn[0].count, 1);

  assert.equal(buildClientPdfFilename('Mario Verdi', 'en'), 'Card_Mario_Verdi.pdf');
  const pdfSectionsEn = buildClientPdfSections(samplePool[0], new Date('2026-11-16T08:00:00'), 'en');
  assert.equal(pdfSectionsEn.contactRows[0].label, 'Phone');
  assert.equal(pdfSectionsEn.contactRows[2].label, 'Next Follow-up');
  assert.deepEqual(pdfSectionsEn.tags, ['sea view']);
});
