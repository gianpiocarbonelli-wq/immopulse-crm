import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAppContextSummary,
  buildChatbotSystemInstruction,
  buildValuationPrompt,
  normalizePortalSearchTargets,
} from './geminiService.ts';

test('buildAppContextSummary includes metrics and client summary without crashing on empty fields', () => {
  const summary = buildAppContextSummary({
    activePlan: 'agency',
    agencyCode: 'ROSSI-1234',
    metrics: { total: 2, active: 1, won: 1, lost: 0, remindersDue: 1, conversionRate: 50 },
    clients: [
      {
        name: 'Marco Rossi',
        role: 'Acquirente',
        status: 'In corso',
        propertyType: 'Trilocale',
        zone: 'Milano Navigli',
        price: 320000,
        sqm: 95,
        tags: ['ristrutturato'],
        isFavorite: true,
      },
    ],
  });

  assert.ok(summary.includes('ROSSI-1234'));
  assert.ok(summary.includes('Marco Rossi ★'));
  assert.ok(summary.includes('Milano Navigli'));
  assert.ok(summary.includes('[ristrutturato]'));
});

test('buildChatbotSystemInstruction enforces real estate & app-only scope and valuation rules', () => {
  const instruction = buildChatbotSystemInstruction({ activePlan: 'pro', clients: [] });
  assert.ok(instruction.includes('ESCLUSIVAMENTE'));
  assert.ok(instruction.includes('VALUTAZIONI IMMOBILIARI'));
  assert.ok(instruction.includes('€/mq'));
});

test('buildValuationPrompt formats property valuation parameters cleanly', () => {
  const prompt = buildValuationPrompt({
    city: 'Milano',
    zone: 'Isola',
    propertyType: 'Appartamento',
    sqm: 85,
    rooms: '3 locali',
    condition: 'Ristrutturato',
  });
  assert.ok(prompt.includes('Milano'));
  assert.ok(prompt.includes('Isola'));
  assert.ok(prompt.includes('85 mq'));
  assert.ok(prompt.includes('Ristrutturato'));
});

test('normalizePortalSearchTargets keeps enabled valid portals and deduplicates domains', () => {
  const targets = normalizePortalSearchTargets([
    { id: '1', name: 'Immobiliare', url: 'https://www.immobiliare.it', enabled: true },
    { id: '2', name: 'Dup', url: 'immobiliare.it/', enabled: true },
    { id: '3', name: 'Disabled', url: 'https://www.casa.it', enabled: false },
    { id: '4', name: 'Custom', url: 'tecnocasa.it', enabled: true },
  ]);

  assert.equal(targets.length, 2);
  assert.deepEqual(
    targets.map((t) => t.domain),
    ['immobiliare.it', 'tecnocasa.it'],
  );
});
