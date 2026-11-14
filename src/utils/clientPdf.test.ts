import test from 'node:test';
import assert from 'node:assert/strict';
import type { ClientRecord } from '../types/crm';
import {
  buildClientPdfFilename,
  buildClientPdfSections,
  formatPdfCurrency,
  generateClientPdfDocument,
  sanitizePdfText,
} from './clientPdf';

function makeSampleClient(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: 'client-pdf-1',
    name: "Antonio D'Amico",
    phone: '3391234567',
    email: 'antonio@esempio.it',
    role: 'Acquirente',
    propertyType: 'Attico',
    zone: "Sant'Ambrogio",
    address: 'Via Carducci 12, Milano',
    price: 480000,
    sqm: 135,
    rooms: '4 Locali',
    floor: '5° piano',
    condoFees: 210,
    hasElevator: true,
    hasBalcony: true,
    hasGarage: true,
    status: 'Trattativa',
    reminderDate: '2026-11-18T11:30',
    note: 'Interessato a vista panoramica e consegna rapida.',
    notes: 'Interessato a vista panoramica e consegna rapida.',
    tags: ['vista mare', 'investimento', 'ristrutturato'],
    history: [
      {
        id: 'h1',
        date: '2026-11-10T09:15',
        type: 'Chiamata',
        note: 'Primo contatto telefonico.',
      },
      {
        id: 'h2',
        date: '2026-11-14T16:45',
        type: 'Visita',
        note: 'Visita effettuata con esito positivo sul terrazzo.',
      },
    ],
    photoBase64: '',
    photos: [],
    isFavorite: true,
    ...overrides,
  };
}

test('buildClientPdfFilename and sanitizePdfText handle apostrophes, accents, and currency cleanly', () => {
  assert.equal(buildClientPdfFilename("Antonio D'Amico"), 'Scheda_Antonio_D_Amico.pdf');
  assert.equal(buildClientPdfFilename('Niccolò Brambilla'), 'Scheda_Niccolo_Brambilla.pdf');
  assert.equal(buildClientPdfFilename('   '), 'Scheda_Cliente.pdf');

  assert.equal(formatPdfCurrency(320000), 'EUR 320.000');
  assert.equal(formatPdfCurrency(0), 'Non specificato');
  assert.equal(sanitizePdfText('Prezzo € 250.000 — zona Centro'), 'Prezzo EUR 250.000 - zona Centro');
});

test('buildClientPdfSections extracts main details, tags, note, and sorted history', () => {
  const client = makeSampleClient();
  const sections = buildClientPdfSections(client, new Date(2026, 10, 14, 10, 0, 0));

  assert.equal(sections.title, "Antonio D'Amico");
  assert.equal(sections.subtitle, 'Acquirente - Trattativa - Cliente Preferito');
  assert.ok(sections.contactRows.some((r) => r.label === 'Telefono' && r.value === '3391234567'));
  assert.ok(sections.propertyRows.some((r) => r.label === 'Prezzo / Budget' && r.value === 'EUR 480.000'));
  assert.ok(sections.propertyRows.some((r) => r.label === 'Dotazioni' && r.value.includes('Ascensore')));
  assert.deepEqual(sections.tags, ['vista mare', 'investimento', 'ristrutturato']);
  assert.equal(sections.note, 'Interessato a vista panoramica e consegna rapida.');

  // Sorted most-recent first
  assert.equal(sections.history.length, 2);
  assert.equal(sections.history[0].type, 'Visita');
  assert.equal(sections.history[0].note, 'Visita effettuata con esito positivo sul terrazzo.');
  assert.equal(sections.history[1].type, 'Chiamata');
});

test('generateClientPdfDocument emits valid PDF bytes with details, tags, and history across pages', () => {
  const client = makeSampleClient();
  const doc = generateClientPdfDocument(client, {
    generatedAt: new Date(2026, 10, 14, 10, 0, 0),
    compress: false,
  });

  const rawPdf = doc.output();
  assert.ok(rawPdf.startsWith('%PDF-1.'));
  assert.ok(rawPdf.includes("Antonio D'Amico"));
  assert.ok(rawPdf.includes('EUR 480.000'));
  assert.ok(rawPdf.includes('vista mare'));
  assert.ok(rawPdf.includes('investimento'));
  assert.ok(rawPdf.includes('Visita effettuata con esito positivo sul terrazzo.'));
  assert.equal(doc.getNumberOfPages(), 1);

  // Multi-page pagination check for long history lists
  const manyActivities = Array.from({ length: 24 }, (_, idx) => ({
    id: `hist-${idx}`,
    date: `2026-11-${String((idx % 28) + 1).padStart(2, '0')}T10:00`,
    type: 'Chiamata' as const,
    note: `Aggiornamento numero ${idx + 1}: verifica documentazione immobile e disponibilità visita.`,
  }));
  const multiPageDoc = generateClientPdfDocument(
    makeSampleClient({ history: manyActivities }),
    { compress: false },
  );
  assert.ok(multiPageDoc.getNumberOfPages() >= 2);
});
