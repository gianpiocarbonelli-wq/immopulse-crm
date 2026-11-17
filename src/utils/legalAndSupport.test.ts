import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSupportEmailUrl,
  buildSupportWhatsAppUrl,
  formatPrice,
  getLegalDocument,
  LEGAL_DOC_ORDER,
  LEGAL_OWNER_NAME,
  STRIPE_ANNUAL_CHECKOUT_URL,
  STRIPE_CUSTOMER_PORTAL_URL,
  STRIPE_MONTHLY_CHECKOUT_URL,
  STRIPE_PRO_CHECKOUT_URL,
  SUBSCRIPTION_CONFIG,
  SUPPORT_EMAIL,
} from './legalAndSupport';

test('legal documents contain all required Italian GDPR, Stripe, cache liability, and Singolo Pro clauses', () => {
  assert.deepEqual(LEGAL_DOC_ORDER, ['privacy', 'terms', 'dpa', 'cookies']);

  const combinedText = LEGAL_DOC_ORDER.map((key) => {
    const doc = getLegalDocument(key);
    return [doc.title, doc.subtitle, ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join(
      '\n',
    );
  }).join('\n');

  assert.ok(combinedText.includes(LEGAL_OWNER_NAME));
  assert.ok(combinedText.includes(SUPPORT_EMAIL));
  assert.ok(combinedText.includes('Stripe'));
  assert.ok(combinedText.includes('localStorage'));
  assert.ok(combinedText.includes('sincronizz'));
  assert.ok(combinedText.toLowerCase().includes('cache'));
  assert.ok(combinedText.includes('vietata la condivisione'));
  assert.ok(combinedText.includes('2016/679'));
  assert.ok(combinedText.includes('Titolare del trattamento'));
  assert.ok(combinedText.includes('Responsabile del trattamento'));
});

test('Stripe Customer Portal URL, Checkout URLs, and support email/WhatsApp URLs build safely', () => {
  assert.equal(
    STRIPE_CUSTOMER_PORTAL_URL,
    'https://billing.stripe.com/p/login/INSERISCI_LINK_PORTALE',
  );
  assert.equal(
    STRIPE_MONTHLY_CHECKOUT_URL,
    'https://buy.stripe.com/eVqaEWawH6BfdXo0IZ1B606',
  );
  assert.equal(
    STRIPE_ANNUAL_CHECKOUT_URL,
    'https://buy.stripe.com/14A4gy8oz2kZf1s1N31B607',
  );
  assert.equal(
    STRIPE_PRO_CHECKOUT_URL,
    'https://buy.stripe.com/dRm28q34f6Bff1s77n1B605',
  );

  const mailUrl = buildSupportEmailUrl('agente@studio.it', 'pro');
  assert.ok(mailUrl.startsWith(`mailto:${SUPPORT_EMAIL}?subject=`));
  assert.ok(decodeURIComponent(mailUrl).includes('agente@studio.it'));
  assert.ok(decodeURIComponent(mailUrl).includes('PRO'));

  const waUrl = buildSupportWhatsAppUrl('agente@studio.it', 'agency');
  assert.ok(waUrl.startsWith('https://wa.me/?text='));
  assert.ok(decodeURIComponent(waUrl).includes('supporto tecnico'));
  assert.ok(decodeURIComponent(waUrl).includes('AGENCY'));
});

test('SUBSCRIPTION_CONFIG and formatPrice lock currency to EUR without local RON conversion', () => {
  assert.equal(SUBSCRIPTION_CONFIG.currency, 'EUR');
  assert.equal(SUBSCRIPTION_CONFIG.currencySymbol, '€');
  assert.equal(SUBSCRIPTION_CONFIG.plans.monthly.priceEUR, 16.99);
  assert.equal(SUBSCRIPTION_CONFIG.plans.monthly.label, '16,99 € al mese');

  const formattedMonthly = formatPrice(SUBSCRIPTION_CONFIG.plans.monthly.priceEUR);
  assert.ok(formattedMonthly.includes('16,99'));
  assert.ok(formattedMonthly.includes('€'));
  assert.ok(!formattedMonthly.includes('RON'));

  const formattedAnnual = formatPrice(SUBSCRIPTION_CONFIG.plans.annual.priceEUR);
  assert.ok(formattedAnnual.includes('99,00'));
  assert.ok(formattedAnnual.includes('€'));

  const formattedAgency = formatPrice(SUBSCRIPTION_CONFIG.plans.agency.priceEUR);
  assert.ok(formattedAgency.includes('149,00'));
  assert.ok(formattedAgency.includes('€'));
});

