import { jsPDF } from 'jspdf';
import type { ClientInteraction, ClientRecord } from '../types/crm';
import {
  formatInteractionDate,
  getClientNote,
  getClientPhotos,
  normalizeHistory,
  normalizeTags,
} from './crmLogic';

export interface PdfDetailRow {
  label: string;
  value: string;
}

export interface ClientPdfSections {
  title: string;
  subtitle: string;
  generatedLabel: string;
  contactRows: PdfDetailRow[];
  propertyRows: PdfDetailRow[];
  tags: string[];
  note: string;
  history: Array<{
    dateLabel: string;
    type: string;
    note: string;
  }>;
  primaryPhotoDataUrl: string | null;
}

export function sanitizePdfText(value: unknown): string {
  return String(value ?? '')
    .replace(/\u20AC/g, 'EUR ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatPdfCurrency(price: number | undefined): string {
  if (!price || price <= 0) return 'Non specificato';
  return `EUR ${new Intl.NumberFormat('it-IT', {
    maximumFractionDigits: 0,
  }).format(price)}`;
}

export function buildClientPdfFilename(clientName: string): string {
  const normalized = String(clientName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const base = normalized || 'Cliente';
  return `Scheda_${base}.pdf`;
}

export function buildClientPdfSections(
  client: ClientRecord,
  generatedAt: Date = new Date(),
): ClientPdfSections {
  const tags = normalizeTags(client.tags);
  const note = getClientNote(client);
  const photos = getClientPhotos(client);
  const historyItems: ClientInteraction[] = normalizeHistory(client.history);

  const generatedLabel = generatedAt.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  let reminderLabel = 'Nessun promemoria';
  if (client.reminderDate) {
    const d = new Date(client.reminderDate);
    reminderLabel = Number.isNaN(d.getTime())
      ? client.reminderDate
      : d.toLocaleString('it-IT', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  }

  const features: string[] = [];
  if (client.hasElevator) features.push('Ascensore');
  if (client.hasBalcony) features.push('Balcone / Terrazzo');
  if (client.hasGarage) features.push('Garage / Posto Auto');

  const contactRows: PdfDetailRow[] = [
    { label: 'Telefono', value: client.phone || 'Non specificato' },
    { label: 'Email', value: client.email?.trim() || 'Non specificata' },
    { label: 'Prossimo richiamo', value: reminderLabel },
  ];

  const propertyRows: PdfDetailRow[] = [
    { label: 'Tipologia', value: client.propertyType || 'Appartamento' },
    { label: 'Prezzo / Budget', value: formatPdfCurrency(client.price) },
    { label: 'Superficie', value: client.sqm > 0 ? `${client.sqm} mq` : 'Non specificata' },
    { label: 'Vani', value: client.rooms?.trim() || 'Non specificati' },
    { label: 'Piano', value: client.floor?.trim() || 'Non specificato' },
    {
      label: 'Spese condominiali',
      value: client.condoFees > 0 ? `EUR ${client.condoFees}/mese` : 'Non specificate',
    },
    { label: 'Zona / Quartiere', value: client.zone?.trim() || 'Non specificata' },
    { label: 'Indirizzo', value: client.address?.trim() || 'Non specificato' },
    { label: 'Dotazioni', value: features.length > 0 ? features.join(', ') : 'Nessuna indicata' },
  ];

  const statusParts: string[] = [client.role, client.status];
  if (client.isFavorite) {
    statusParts.push('Cliente Preferito');
  }

  return {
    title: client.name || 'Cliente senza nome',
    subtitle: statusParts.join(' - '),
    generatedLabel,
    contactRows,
    propertyRows,
    tags,
    note,
    history: historyItems.map((entry) => ({
      dateLabel: formatInteractionDate(entry.date),
      type: entry.type,
      note: entry.note || '-',
    })),
    primaryPhotoDataUrl: photos[0] || null,
  };
}

export function generateClientPdfDocument(
  client: ClientRecord,
  options: { generatedAt?: Date; compress?: boolean } = {},
): jsPDF {
  const sections = buildClientPdfSections(client, options.generatedAt);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: options.compress ?? true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2;
  let y = 0;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm <= pageHeight - 18) return;
    doc.addPage();
    y = 18;
  };

  const drawSectionHeading = (label: string) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(23, 120, 88);
    doc.text(sanitizePdfText(label.toUpperCase()), marginX, y);
    y += 2;
    doc.setDrawColor(203, 226, 222);
    doc.setLineWidth(0.35);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 5.5;
  };

  // Top Brand Header Band
  doc.setFillColor(14, 77, 95);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(46, 176, 134);
  doc.text('ImmoPulse - Agenda CRM Immobiliare', marginX, 11);

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  const safeTitle = sanitizePdfText(sections.title);
  doc.text(doc.splitTextToSize(safeTitle, contentWidth - 45)[0] || safeTitle, marginX, 19.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(215, 239, 235);
  doc.text(sanitizePdfText(sections.subtitle), marginX, 25.5);

  doc.setFontSize(8.5);
  doc.text(
    sanitizePdfText(`Generato il ${sections.generatedLabel}`),
    pageWidth - marginX,
    11,
    { align: 'right' },
  );

  y = 40;

  // Section 1: Main Details (Contacts + Property)
  drawSectionHeading('Dettagli Principali');

  const allDetailRows = [...sections.contactRows, ...sections.propertyRows];
  const colWidth = (contentWidth - 6) / 2;
  const rowLineStep = 5;

  for (let i = 0; i < allDetailRows.length; i += 2) {
    const left = allDetailRows[i];
    const right = allDetailRows[i + 1];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const leftLines = doc.splitTextToSize(sanitizePdfText(left.value), colWidth - 4);
    const rightLines = right ? doc.splitTextToSize(sanitizePdfText(right.value), colWidth - 4) : [];
    const blockHeight = Math.max(leftLines.length, rightLines.length, 1) * rowLineStep + 6.5;

    ensureSpace(blockHeight);

    const drawField = (row: PdfDetailRow, xPos: number, lines: string[]) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(90, 128, 138);
      doc.text(sanitizePdfText(row.label.toUpperCase()), xPos, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 59, 71);
      doc.text(lines, xPos, y + 4.3);
    };

    drawField(left, marginX, leftLines);
    if (right) {
      drawField(right, marginX + colWidth + 6, rightLines);
    }

    y += blockHeight;
  }

  y += 2;

  // Section 2: Tags
  drawSectionHeading('Etichette / Tag');
  if (sections.tags.length === 0) {
    ensureSpace(8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(90, 128, 138);
    doc.text('Nessuna etichetta associata a questo cliente.', marginX, y);
    y += 8;
  } else {
    let tagX = marginX;
    let tagY = y;
    const chipHeight = 6.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);

    for (const tag of sections.tags) {
      const label = sanitizePdfText(tag);
      const chipWidth = doc.getTextWidth(label) + 7;
      if (tagX + chipWidth > pageWidth - marginX) {
        tagX = marginX;
        tagY += chipHeight + 2.5;
      }
      if (tagY + chipHeight > pageHeight - 18) {
        doc.addPage();
        tagY = 18;
        tagX = marginX;
      }
      doc.setFillColor(238, 246, 245);
      doc.setDrawColor(203, 226, 222);
      doc.roundedRect(tagX, tagY - 4.5, chipWidth, chipHeight, 1.5, 1.5, 'FD');
      doc.setTextColor(14, 77, 95);
      doc.text(label, tagX + 3.5, tagY);
      tagX += chipWidth + 2.5;
    }

    y = tagY + 8;
  }

  // Section 3: Note
  drawSectionHeading('Note Cliente');
  if (!sections.note) {
    ensureSpace(8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(90, 128, 138);
    doc.text('Nessuna nota registrata.', marginX, y);
    y += 8;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const noteLines = doc.splitTextToSize(sanitizePdfText(sections.note), contentWidth - 6);
    const boxHeight = noteLines.length * 4.8 + 6;
    ensureSpace(boxHeight + 2);
    doc.setFillColor(244, 250, 249);
    doc.setDrawColor(203, 226, 222);
    doc.roundedRect(marginX, y - 3.5, contentWidth, boxHeight, 2, 2, 'FD');
    doc.setTextColor(15, 59, 71);
    doc.text(noteLines, marginX + 3, y + 1);
    y += boxHeight + 4;
  }

  // Optional primary photo preview (gracefully ignored if invalid/unsupported)
  if (sections.primaryPhotoDataUrl) {
    try {
      const format = sections.primaryPhotoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      const imgProps = doc.getImageProperties(sections.primaryPhotoDataUrl);
      const maxImgW = 68;
      const maxImgH = 44;
      const ratio = Math.min(maxImgW / imgProps.width, maxImgH / imgProps.height);
      const drawW = Math.max(20, imgProps.width * ratio);
      const drawH = Math.max(15, imgProps.height * ratio);

      drawSectionHeading('Immagine Principale');
      ensureSpace(drawH + 6);
      doc.addImage(sections.primaryPhotoDataUrl, format, marginX, y - 1, drawW, drawH);
      y += drawH + 6;
    } catch {
      // Skip image gracefully if encoding isn't supported by jsPDF
    }
  }

  // Section 4: Chronological Activity History
  drawSectionHeading(`Cronologia Attivita (${sections.history.length})`);
  if (sections.history.length === 0) {
    ensureSpace(8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(90, 128, 138);
    doc.text('Nessuna attivita registrata in cronologia.', marginX, y);
    y += 8;
  } else {
    for (const item of sections.history) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.2);
      const noteLines = doc.splitTextToSize(sanitizePdfText(item.note), contentWidth - 8);
      const entryHeight = noteLines.length * 4.6 + 10.5;
      ensureSpace(entryHeight + 2);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 226, 222);
      doc.roundedRect(marginX, y - 3.5, contentWidth, entryHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(14, 77, 95);
      const headerText = sanitizePdfText(`${item.type}  |  ${item.dateLabel}`);
      doc.text(headerText, marginX + 3.5, y + 1);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.2);
      doc.setTextColor(59, 94, 104);
      doc.text(noteLines, marginX + 3.5, y + 6);

      y += entryHeight + 3;
    }
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 148, 156);
    doc.text(
      sanitizePdfText(`ImmoPulse CRM - Scheda ${sections.title}`),
      marginX,
      pageHeight - 8,
    );
    doc.text(`Pagina ${page} di ${pageCount}`, pageWidth - marginX, pageHeight - 8, {
      align: 'right',
    });
  }

  return doc;
}

export function downloadClientPdf(client: ClientRecord): string {
  const filename = buildClientPdfFilename(client.name);
  const doc = generateClientPdfDocument(client);
  doc.save(filename);
  return filename;
}
