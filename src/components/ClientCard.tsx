import { useEffect, useRef, useState } from 'react';
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
  Search,
  Star,
  StickyNote,
  Sun,
  Tag,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { ClientRecord, ClientStatus } from '../types/crm';
import {
  getResponsiveRootMargin,
  supportsIntersectionObserver,
} from '../utils/lazyMedia';
import { LazyImage } from './LazyImage';
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
import {
  translateInteractionType,
  translatePropertyType,
  translateRole,
  translateStatus,
  translateSuggestedTag,
} from '../utils/i18n';

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
  onSearchPortals?: (client: ClientRecord) => void;
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
  onSearchPortals,
}: ClientCardProps) {
  const { lang, locale } = useLanguage();
  const photos = getClientPhotos(client);
  const noteText = getClientNote(client);
  const clientTags = normalizeTags(client.tags);
  const latestInteraction = getLatestInteraction(client);
  const formattedPrice = formatCurrencyEUR(client.price, lang);
  const telHref = String(client.phone || '').replace(/[^\d+]/g, '');
  const hasEmail = Boolean(client.email && client.email.trim());
  const mapsUrl = buildMapsUrl(client.address, client.zone);
  const statusDisplay = getStatusDisplay(client.status);
  const StatusIcon = statusDisplay.Icon;

  const galleryContainerRef = useRef<HTMLDivElement | null>(null);
  const [isGalleryVisible, setIsGalleryVisible] = useState<boolean>(
    () => !supportsIntersectionObserver(),
  );

  useEffect(() => {
    if (photos.length === 0 || isGalleryVisible) return;
    if (!supportsIntersectionObserver()) {
      setIsGalleryVisible(true);
      return;
    }

    const node = galleryContainerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setIsGalleryVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        rootMargin: getResponsiveRootMargin(window.innerWidth, 'vertical'),
        threshold: 0.01,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [photos.length, isGalleryVisible]);

  let reminderLabel: string | null = null;
  let reminderOverdue = false;
  if (client.reminderDate) {
    const rDate = new Date(client.reminderDate);
    if (!Number.isNaN(rDate.getTime())) {
      reminderOverdue = rDate < new Date();
      reminderLabel = rDate.toLocaleString(locale, {
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
      className="client-card-optimized bg-white border border-[#cbe2de] rounded-xl p-4 flex flex-col justify-between hover:border-[#2eb086] transition-colors"
    >
      <div className="space-y-3">
        {/* Header: Unboxed metadata kicker + primary title + edit/delete */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#4a707a]">
              <span className="text-[#0e4d5f] font-semibold">
                {translateRole(client.role, lang)}
              </span>
              <span aria-hidden="true">·</span>
              <span className={`inline-flex items-center gap-1 font-semibold ${statusDisplay.textClass}`}>
                <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
                {translateStatus(client.status, lang)}
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
                  ? lang === 'en'
                    ? `Remove ${client.name} from favorites`
                    : `Rimuovi ${client.name} dai preferiti`
                  : lang === 'en'
                    ? `Mark ${client.name} as favorite`
                    : `Contrassegna ${client.name} come preferito`
              }
              title={
                client.isFavorite
                  ? lang === 'en'
                    ? 'Remove from favorites'
                    : 'Rimuovi dai preferiti'
                  : lang === 'en'
                    ? 'Mark as favorite'
                    : 'Contrassegna come preferito'
              }
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
              aria-label={
                lang === 'en'
                  ? `Download PDF for ${client.name}`
                  : `Scarica PDF di ${client.name}`
              }
              title={
                lang === 'en'
                  ? `Download PDF card for ${client.name}`
                  : `Scarica scheda PDF di ${client.name}`
              }
              className="p-2 rounded-lg text-[#5a808a] hover:text-[#177858] hover:bg-[#eef6f5] transition-colors focus-visible:outline-2 focus-visible:outline-[#0e4d5f]"
            >
              <FileDown className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onEdit(client.id)}
              aria-label={lang === 'en' ? `Edit ${client.name}` : `Modifica ${client.name}`}
              title={lang === 'en' ? `Edit ${client.name}` : `Modifica ${client.name}`}
              className="p-2 rounded-lg text-[#5a808a] hover:text-[#0e4d5f] hover:bg-[#eef6f5] transition-colors focus-visible:outline-2 focus-visible:outline-[#0e4d5f]"
            >
              <Edit3 className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(client.id)}
              aria-label={lang === 'en' ? `Delete ${client.name}` : `Elimina ${client.name}`}
              title={lang === 'en' ? `Delete ${client.name}` : `Elimina ${client.name}`}
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
              {client.propertyType
                ? translatePropertyType(client.propertyType, lang)
                : lang === 'en'
                  ? 'Property'
                  : 'Immobile'}
              {client.sqm > 0 && (
                <span className="font-normal text-[#4a707a] tabular-nums">
                  {' '}
                  · {client.sqm} {lang === 'en' ? 'sqm' : 'm²'}
                </span>
              )}
            </span>
            <span className="text-[#177858] font-bold font-mono tabular-nums whitespace-nowrap shrink-0">
              {formattedPrice}
            </span>
          </div>

          <div className="text-[#4a707a] flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-[#2eb086] shrink-0" aria-hidden="true" />
            <span className="truncate">
              {client.zone || (lang === 'en' ? 'Area not specified' : 'Zona non specificata')}
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
                  <span>
                    {lang === 'en'
                      ? `Fees € ${client.condoFees}/mo`
                      : `Spese € ${client.condoFees}/mese`}
                  </span>
                </>
              )}
            </div>
          )}

          {(client.hasElevator || client.hasBalcony || client.hasGarage) && (
            <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-[#4a707a]">
              {client.hasElevator && (
                <span className="inline-flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-[#0e4d5f]" aria-hidden="true" />{' '}
                  {lang === 'en' ? 'Elevator' : 'Ascensore'}
                </span>
              )}
              {client.hasBalcony && (
                <span className="inline-flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-600" aria-hidden="true" />{' '}
                  {lang === 'en' ? 'Balcony' : 'Balcone'}
                </span>
              )}
              {client.hasGarage && (
                <span className="inline-flex items-center gap-1">
                  <Car className="w-3 h-3 text-[#1d8f6a]" aria-hidden="true" />{' '}
                  {lang === 'en' ? 'Garage' : 'Box'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Multi-photo preview with viewport + horizontal lazy loading */}
        {photos.length > 0 && (
          <div ref={galleryContainerRef} className="space-y-1.5">
            <button
              type="button"
              onClick={() => onOpenGallery(client.id, 0)}
              aria-label={
                lang === 'en'
                  ? `Open property gallery for ${client.name} (${photos.length} photos)`
                  : `Apri galleria foto immobile di ${client.name} (${photos.length} foto)`
              }
              className="relative block w-full group rounded-lg overflow-hidden border border-[#cbe2de] bg-[#eef6f5] focus-visible:outline-2 focus-visible:outline-[#0e4d5f]"
            >
              <LazyImage
                src={photos[0]}
                alt={
                  lang === 'en'
                    ? `Property photo for ${client.name}`
                    : `Foto immobile di ${client.name}`
                }
                direction="vertical"
                wrapperClassName="w-full h-28 bg-[#eef6f5]"
                className="w-full h-28 object-cover md:group-hover:scale-[1.02] transition-transform duration-300"
              />
              <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#0e4d5f]/90 text-white inline-flex items-center gap-1 tabular-nums">
                <Images className="w-3 h-3" aria-hidden="true" /> {photos.length}{' '}
                {lang === 'en' ? 'photos' : 'foto'}
              </span>
            </button>

            {photos.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {photos.map((src, idx) => (
                  <button
                    key={`${client.id}-thumb-${idx}`}
                    type="button"
                    onClick={() => onOpenGallery(client.id, idx)}
                    aria-label={
                      lang === 'en'
                        ? `View photo ${idx + 1} for ${client.name}`
                        : `Vedi foto ${idx + 1} di ${client.name}`
                    }
                    className="shrink-0 rounded-md overflow-hidden border border-[#cbe2de] hover:border-[#2eb086] transition-colors bg-[#eef6f5] focus-visible:outline-2 focus-visible:outline-[#0e4d5f]"
                  >
                    {isGalleryVisible ? (
                      <LazyImage
                        src={src}
                        alt={
                          lang === 'en'
                            ? `Thumbnail ${idx + 1} for ${client.name}`
                            : `Miniatura ${idx + 1} immobile ${client.name}`
                        }
                        direction="horizontal"
                        wrapperClassName="w-10 h-10 bg-[#eef6f5]"
                        className="w-10 h-10 object-cover"
                      />
                    ) : (
                      <div aria-hidden="true" className="w-10 h-10 bg-[#eef6f5] animate-pulse" />
                    )}
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
            {clientTags.map((tag) => {
              const displayTag = translateSuggestedTag(tag, lang);
              return onSelectTag ? (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSelectTag(tag)}
                  aria-label={
                    lang === 'en'
                      ? `Filter by tag ${displayTag}`
                      : `Filtra per etichetta ${displayTag}`
                  }
                  title={lang === 'en' ? `Filter by "${displayTag}"` : `Filtra per "${displayTag}"`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#eef6f5] hover:bg-[#dceceb] text-[#0e4d5f] border border-[#cbe2de] text-[11px] font-medium transition-colors"
                >
                  <Tag className="w-2.5 h-2.5 text-[#2eb086] shrink-0" aria-hidden="true" />
                  <span>{displayTag}</span>
                </button>
              ) : (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-[11px] font-medium"
                >
                  <Tag className="w-2.5 h-2.5 text-[#2eb086] shrink-0" aria-hidden="true" />
                  <span>{displayTag}</span>
                </span>
              );
            })}
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
                <span>{lang === 'en' ? 'Last contact:' : 'Ultimo contatto:'}</span>
                <span>{translateInteractionType(latestInteraction.type, lang)}</span>
                <span aria-hidden="true">·</span>
                <span className="font-normal text-[#5a808a] tabular-nums">
                  {formatInteractionDate(latestInteraction.date, lang)}
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
              {lang === 'en' ? 'Follow-up:' : 'Richiamo:'} {reminderLabel}
              {reminderOverdue ? (lang === 'en' ? ' (Overdue)' : ' (Scaduto)') : ''}
            </span>
          </div>
        )}
      </div>

      {/* Contact & Map Action Bar */}
      <div className="mt-4 pt-3 border-t border-[#e4f0ee] grid grid-cols-4 gap-1.5">
        {telHref ? (
          <a
            href={`tel:${telHref}`}
            aria-label={lang === 'en' ? `Call ${client.name}` : `Chiama ${client.name}`}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[#f4faf9] hover:bg-[#e2f3ef] text-[#0e4d5f] hover:text-[#177858] transition-colors"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">
              {lang === 'en' ? 'Call' : 'Chiama'}
            </span>
          </a>
        ) : (
          <span
            aria-disabled="true"
            title={lang === 'en' ? 'Invalid phone number' : 'Telefono non valido'}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[#f4faf9] text-[#8bb3bd] opacity-60 cursor-not-allowed"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">
              {lang === 'en' ? 'Call' : 'Chiama'}
            </span>
          </span>
        )}

        {allowExtraChannels ? (
          <a
            href={buildWhatsAppUrl(client.phone, client.name, client.zone, client.propertyType, lang)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={
              lang === 'en' ? `Send WhatsApp to ${client.name}` : `Invia WhatsApp a ${client.name}`
            }
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
                lang === 'en'
                  ? 'WhatsApp is locked in Guest mode (max 3 clients, Call & Email only).'
                  : 'WhatsApp è bloccato in modalità Ospite (max 3 clienti, solo Chiama ed Email).',
              )
            }
            aria-label={
              lang === 'en'
                ? `Unlock WhatsApp for ${client.name}`
                : `Sblocca WhatsApp per ${client.name}`
            }
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
            aria-label={
              lang === 'en' ? `Send Email to ${client.name}` : `Invia Email a ${client.name}`
            }
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[#f4faf9] hover:bg-[#e2f3ef] text-[#0e4d5f] transition-colors"
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">Email</span>
          </a>
        ) : (
          <span
            aria-disabled="true"
            title={lang === 'en' ? 'No email entered' : 'Email non inserita'}
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
                lang === 'en'
                  ? 'Maps is locked in Guest mode (max 3 clients, Call & Email only).'
                  : 'La funzione Mappa è bloccata in modalità Ospite (max 3 clienti, solo Chiama ed Email).',
              )
            }
            aria-label={
              lang === 'en' ? `Unlock Map for ${client.name}` : `Sblocca Mappa per ${client.name}`
            }
            className="relative flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-800 transition-colors"
          >
            <Lock className="w-3 h-3 absolute top-1 right-1 text-amber-600" aria-hidden="true" />
            <Navigation className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">
              {lang === 'en' ? 'Map' : 'Mappa'}
            </span>
          </button>
        ) : mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={lang === 'en' ? `Open Map for ${client.name}` : `Apri Mappa per ${client.name}`}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[#f4faf9] hover:bg-cyan-50 text-[#0e4d5f] hover:text-[#116f7d] transition-colors"
          >
            <Navigation className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">
              {lang === 'en' ? 'Map' : 'Mappa'}
            </span>
          </a>
        ) : (
          <span
            aria-disabled="true"
            title={lang === 'en' ? 'No address entered' : 'Indirizzo non inserito'}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[#f4faf9] text-[#8bb3bd] opacity-60 cursor-not-allowed"
          >
            <Navigation className="w-4 h-4" aria-hidden="true" />
            <span className="text-[11px] mt-1 font-medium whitespace-nowrap">
              {lang === 'en' ? 'Map' : 'Mappa'}
            </span>
          </span>
        )}
      </div>

      {onSearchPortals && (
        <button
          type="button"
          data-testid={`client-search-portals-${client.id}`}
          onClick={() => onSearchPortals(client)}
          className="mt-2.5 w-full py-2 px-3 rounded-lg bg-[#177858] hover:bg-[#0e4d5f] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
        >
          <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{lang === 'en' ? 'Search on 4 Portals' : 'Cerca su 4 Portali'}</span>
        </button>
      )}
    </article>
  );
}
