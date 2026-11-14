import {
  ArrowUpDown,
  Car,
  CheckCircle2,
  Clock,
  Edit3,
  FileDown,
  History,
  Images,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Star,
  StickyNote,
  Sun,
  Tag,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { ClientRecord, ClientStatus } from '../types/crm';
import {
  buildMapsUrl,
  buildWhatsAppUrl,
  formatCurrencyEUR,
  formatInteractionDate,
  getClientNote,
  getClientPhotos,
  getLatestInteraction,
  normalizeTags,
} from '../utils/crmLogic';

interface ClientCardProps {
  client: ClientRecord;
  allowExtraChannels: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDownloadPdf: (id: string) => void;
  onSelectTag?: (tag: string) => void;
  onOpenGallery: (id: string, startIndex: number) => void;
  onRequireUpgrade: (reason: string) => void;
}

function getStatusDisplay(status: ClientStatus) {
  switch (status) {
    case 'In corso':
      return { textClass: 'text-amber-700', Icon: Clock };
    case 'Trattativa':
      return { textClass: 'text-[#0e4d5f]', Icon: Clock };
    case 'Accettato':
      return { textClass: 'text-[#1d8f6a]', Icon: CheckCircle2 };
    case 'Perso':
      return { textClass: 'text-rose-700', Icon: XCircle };
  }
}

export function ClientCard({
  client,
  allowExtraChannels,
  onEdit,
  onDelete,
  onToggleFavorite,
  onDownloadPdf,
  onSelectTag,
  onOpenGallery,
  onRequireUpgrade,
}: ClientCardProps) {
  const photos = getClientPhotos(client);
  const noteText = getClientNote(client);
  const clientTags = normalizeTags(client.tags);
  const latestInteraction = getLatestInteraction(client);
  const formattedPrice = formatCurrencyEUR(client.price);
  const telHref = String(client.phone || '').replace(/[^\d+]/g, '');
  const hasEmail = Boolean(client.email && client.email.trim());
  const mapsUrl = buildMapsUrl(client.address, client.zone);
  const statusDisplay = getStatusDisplay(client.status);
  const StatusIcon = statusDisplay.Icon;

  let reminderLabel: string | null = null;
  let reminderOverdue = false;
  if (client.reminderDate) {
    const rDate = new Date(client.reminderDate);
    if (!Number.isNaN(rDate.getTime())) {
      reminderOverdue = rDate < new Date();
      reminderLabel = rDate.toLocaleString('it-IT', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  return (
    <article
      data-testid={`client-card-${client.id}`}
      className="bg-white border border-[#cbe2de] rounded-xl p-4 flex flex-col justify-between hover:border-[#2eb086] transition-colors"
    >
      <div className="space-y-3">
        {/* Header: Unboxed metadata kicker + primary title + edit/delete */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#4a707a]">
              <span className="text-[#0e4d5f] font-semibold">{client.role}</span>
              <span aria-hidden="true">·</span>
              <span className={`inline-flex items-center gap-1 font-semibold ${statusDisplay.textClass}`}>
                <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
                {client.status}
              </span>
            </div>
            <h3 className="font-bold text-base text-[#0e4d5f] mt-1 truncate">{client.name}</h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFavorite(client.id)}
              aria-pressed={Boolean(client.isFavorite)}
              aria-label={
                client.isFavorite
                  ? `Rimuovi ${client.name} dai preferiti`
                  : `Contrassegna ${client.name} come preferito`
              }
              title={client.isFavorite ? 'Rimuovi dai preferiti' : 'Contrassegna come preferito'}
              className={`p-2 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[#0e4d5f] ${
                client.isFavorite
                  ? 'text-amber-500 hover:bg-amber-50'
                  : 'text-[#5a808a] hover:text-amber-600 hover:bg-[#eef6f5]'
              }`}
            >
              <Star
                className={`w-4 h-4 ${client.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={() => onDownloadPdf(client.id)}
              aria-label={`Scarica PDF di ${client.name}`}
              title={`Scarica scheda PDF di ${client.name}`}
              className="p-2 rounded-lg text-[#5a808a] hover:text-[#177858] hover:bg-[#eef6f5] transition-colors focus-visible:outline-2 focus-visible:outline-[#0e4d5f]"
            >
              <FileDown className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onEdit(client.id)}
              aria-label={`Modifica ${client.name}`}
              title={`Modifica ${client.name}`}
              className="p-2 rounded-lg text-[#5a808a] hover:text-[#0e4d5f] hover:bg-[#eef6f5] transition-colors focus-visible:outline-2 focus-visible:outline-[#0e4d5f]"
            >
              <Edit3 className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(client.id)}
              aria-label={`Elimina ${client.name}`}
              title={`Elimina ${client.name}`}
              className="p-2 rounded-lg text-[#5a808a] hover:text-rose-700 hover:bg-rose-50 transition-colors focus-visible:outline-2 focus-visible:outline-rose-600"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Property Summary separated cleanly via hairline divider */}
        <div className="pt-2.5 border-t border-[#e4f0ee] space-y-1.5 text-xs text-[#3b5e68]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-[#0e4d5f] truncate">
              {client.propertyType || 'Immobile'}
              {client.sqm > 0 && (
                <span className="font-normal text-[#4a707a] tabular-nums"> · {client.sqm} m²</span>
              )}
            </span>
            <span className="text-[#177858] font-bold font-mono tabular-nums whitespace-nowrap shrink-0">
              {formattedPrice}
            </span>
          </div>

          <div className="text-[#4a707a] flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-[#2eb086] shrink-0" aria-hidden="true" />
            <span className="truncate">
              {client.zone || 'Zona non specificata'}
              {client.address ? ` — ${client.address}` : ''}
            </span>
          </div>

          {(client.rooms || client.floor || client.condoFees > 0) && (
            <div className="text-[#4a707a] flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
              {client.rooms && <span>{client.rooms}</span>}
              {client.rooms && client.floor && <span aria-hidden="true">·</span>}
              {client.floor && <span>{client.floor}</span>}
              {client.condoFees > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Spese € {client.condoFees}/mese</span>
                </>
              )}
            </div>
          )}

          {(client.hasElevator || client.hasBalcony || client.hasGarage) && (
            <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-[#4a707a]">
              {client.hasElevator && (
                <span className="inline-flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-[#0e4d5f]" aria-hidden="true" /> Ascensore
                </span>
              )}
              {client.hasBalcony && (
                <span className="inline-flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-600" aria-hidden="true" /> Balcone
                </span>
              )}
              {client.hasGarage && (
                <span className="inline-flex items-center gap-1">
                  <Car className="w-3 h-3 text-[#1d8f6a]" aria-hidden="true" /> Box
                </span>
              )}
            </div>
          )}
        </div>

        {/* Multi-photo preview */}
        {photos.length > 0 && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => onOpenGallery(client.id, 0)}
              aria-label={`Apri galleria foto immobile di ${client.name} (${photos.length} foto)`}
              className="relative block w-full group rounded-lg overflow-hidden border border-[#cbe2de] focus-visible:outline-2 focus-visible:outline-[#0e4d5f]"
            >
              <img
                src={photos[0]}
                alt={`Foto immobile di ${client.name}`}
                referrerPolicy="no-referrer"
                className="w-full h-28 object-cover"
              />
              <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#0e4d5f]/90 text-white inline-flex items-center gap-1 tabular-nums">
                <Images className="w-3 h-3" aria-hidden="true" /> {photos.length} foto
              </span>
            </button>

            {photos.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {photos.map((src, idx) => (
                  <button
                    key={`${client.id}-thumb-${idx}`}
                    type="button"
                    onClick={() => onOpenGallery(client.id, idx)}
                    aria-label={`Vedi foto ${idx + 1} di ${client.name}`}
                    className="shrink-0 rounded-md overflow-hidden border border-[#cbe2de] hover:border-[#2eb086] transition-colors focus-visible:outline-2 focus-visible:outline-[#0e4d5f]"
                  >
                    <img
                      src={src}
                      alt={`Miniatura ${idx + 1} immobile ${client.name}`}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {clientTags.length > 0 && (
          <div
            data-testid="client-card-tags"
            className="flex flex-wrap items-center gap-1.5 pt-1"
          >
            {clientTags.map((tag) =>
              onSelectTag ? (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSelectTag(tag)}
                  aria-label={`Filtra per etichetta ${tag}`}
                  title={`Filtra per "${tag}"`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#eef6f5] hover:bg-[#dceceb] text-[#0e4d5f] border border-[#cbe2de] text-[11px] font-medium transition-colors"
                >
                  <Tag className="w-2.5 h-2.5 text-[#2eb086] shrink-0" aria-hidden="true" />
                  <span>{tag}</span>
                </button>
              ) : (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-[11px] font-medium"
                >
                  <Tag className="w-2.5 h-2.5 text-[#2eb086] shrink-0" aria-hidden="true" />
                  <span>{tag}</span>
                </span>
              ),
            )}
          </div>
        )}

        {noteText && (
          <div
            data-testid="client-card-note"
            className="pt-2 border-t border-[#e4f0ee] text-xs text-[#3b5e68] flex items-start gap-1.5"
          >
            <StickyNote className="w-3.5 h-3.5 text-[#5a808a] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="line-clamp-3 leading-relaxed">{noteText}</p>
          </div>
        )}

        {latestInteraction && (
          <div
            data-testid="client-card-last-contact"
            className="pt-2 border-t border-[#e4f0ee] text-xs text-[#3b5e68] flex items-start gap-1.5"
          >
            <History className="w-3.5 h-3.5 text-[#2eb086] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 leading-snug">
              <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-[#0e4d5f]">
                <span>Ultimo contatto:</span>
                <span>{latestInteraction.type}</span>
                <span aria-hidden="true">·</span>
                <span className="font-normal text-[#5a808a] tabular-nums">
                  {formatInteractionDate(latestInteraction.date)}
                </span>
              </div>
              {latestInteraction.note && (
                <p className="text-xs text-[#4a707a] line-clamp-2 mt-0.5">{latestInteraction.note}</p>
              )}
            </div>
          </div>
        )}

        {reminderLabel && (
          <div
            className={`text-xs flex items-center gap-1.5 tabular-nums ${
              reminderOverdue ? 'text-rose-700 font-semibold' : 'text-[#0e4d5f] font-medium'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              Richiamo: {reminderLabel}
              {reminderOverdue ? ' (Scaduto)' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Contact & Map Action Bar */}
      <div className="mt-4 pt-3 border-t border-[#e4f0ee] grid grid-cols-4 gap-1.5">
        {telHref ? (
          <a
            href={`tel:${telHref}`}
            aria-label={`Chiama ${client.name}`}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[#f4faf9] hover:bg-[#e2f3ef] text-[#0e4d5f] hover:text-[#177858] transition-colors"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">Chiama</span>
          </a>
        ) : (
          <span
            aria-disabled="true"
            title="Telefono non valido"
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[#f4faf9] text-[#8bb3bd] opacity-60 cursor-not-allowed"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">Chiama</span>
          </span>
        )}

        {allowExtraChannels ? (
          <a
            href={buildWhatsAppUrl(client.phone, client.name, client.zone, client.propertyType)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Invia WhatsApp a ${client.name}`}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[#f4faf9] hover:bg-[#2eb086]/15 text-[#0e4d5f] hover:text-[#177858] transition-colors"
          >
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">WhatsApp</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={() =>
              onRequireUpgrade(
                'WhatsApp è bloccato in modalità Ospite (max 3 clienti, solo Chiama ed Email).',
              )
            }
            aria-label={`Sblocca WhatsApp per ${client.name}`}
            className="relative flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-800 transition-colors"
          >
            <Lock className="w-3 h-3 absolute top-1 right-1 text-amber-600" aria-hidden="true" />
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">WhatsApp</span>
          </button>
        )}

        {hasEmail ? (
          <a
            href={`mailto:${client.email.trim()}`}
            aria-label={`Invia Email a ${client.name}`}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[#f4faf9] hover:bg-[#e2f3ef] text-[#0e4d5f] transition-colors"
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">Email</span>
          </a>
        ) : (
          <span
            aria-disabled="true"
            title="Email non inserita"
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[#f4faf9] text-[#8bb3bd] opacity-60 cursor-not-allowed"
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">Email</span>
          </span>
        )}

        {!allowExtraChannels ? (
          <button
            type="button"
            onClick={() =>
              onRequireUpgrade(
                'La funzione Mappa è bloccata in modalità Ospite (max 3 clienti, solo Chiama ed Email).',
              )
            }
            aria-label={`Sblocca Mappa per ${client.name}`}
            className="relative flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-800 transition-colors"
          >
            <Lock className="w-3 h-3 absolute top-1 right-1 text-amber-600" aria-hidden="true" />
            <Navigation className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">Mappa</span>
          </button>
        ) : mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Apri Mappa per ${client.name}`}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[#f4faf9] hover:bg-cyan-50 text-[#0e4d5f] hover:text-[#116f7d] transition-colors"
          >
            <Navigation className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">Mappa</span>
          </a>
        ) : (
          <span
            aria-disabled="true"
            title="Indirizzo non inserito"
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[#f4faf9] text-[#8bb3bd] opacity-60 cursor-not-allowed"
          >
            <Navigation className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">Mappa</span>
          </span>
        )}
      </div>
    </article>
  );
}
