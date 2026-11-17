import { type ChangeEvent, type FormEvent, type KeyboardEvent, useEffect, useState } from 'react';
import { FileDown, History, Plus, Tag, Trash2, UserPlus, X } from 'lucide-react';
import type {
  ClientInteraction,
  ClientRecord,
  ClientRole,
  ClientStatus,
  InteractionType,
} from '../types/crm';
import {
  MAX_PHOTOS_PER_CLIENT,
  MAX_TAGS_PER_CLIENT,
  PROPERTY_TYPES,
  SUGGESTED_CLIENT_TAGS,
  VALID_INTERACTION_TYPES,
  addTagToList,
  formatInteractionDate,
  getClientNote,
  getClientPhotos,
  localDateTimeValue,
  normalizeHistory,
  normalizeTags,
  removeTagFromList,
} from '../utils/crmLogic';
import { compressImageFile } from '../utils/imageCompression';
import { useLanguage } from '../contexts/LanguageContext';
import {
  translateInteractionType,
  translatePropertyType,
  translateSuggestedTag,
} from '../utils/i18n';
import { LazyImage } from './LazyImage';

interface ClientFormModalProps {
  isOpen: boolean;
  editingClient: ClientRecord | null;
  onClose: () => void;
  onSave: (client: ClientRecord, isEdit: boolean) => boolean;
  onDownloadPdf?: (client: ClientRecord) => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function ClientFormModal({
  isOpen,
  editingClient,
  onClose,
  onSave,
  onDownloadPdf,
  onNotify,
}: ClientFormModalProps) {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ClientRole>('Acquirente');
  const [propertyType, setPropertyType] = useState('Appartamento');
  const [zone, setZone] = useState('');
  const [price, setPrice] = useState('');
  const [sqm, setSqm] = useState('');
  const [rooms, setRooms] = useState('');
  const [floor, setFloor] = useState('');
  const [condoFees, setCondoFees] = useState('');
  const [address, setAddress] = useState('');
  const [hasElevator, setHasElevator] = useState(false);
  const [hasBalcony, setHasBalcony] = useState(false);
  const [hasGarage, setHasGarage] = useState(false);
  const [status, setStatus] = useState<ClientStatus>('In corso');
  const [reminderDate, setReminderDate] = useState('');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [history, setHistory] = useState<ClientInteraction[]>([]);
  const [historyDate, setHistoryDate] = useState('');
  const [historyType, setHistoryType] = useState<InteractionType>('Chiamata');
  const [historyNote, setHistoryNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (editingClient) {
      setName(editingClient.name || '');
      setPhone(editingClient.phone || '');
      setEmail(editingClient.email || '');
      setRole(editingClient.role || 'Acquirente');
      setPropertyType(editingClient.propertyType || 'Appartamento');
      setZone(editingClient.zone || '');
      setPrice(editingClient.price > 0 ? String(editingClient.price) : '');
      setSqm(editingClient.sqm > 0 ? String(editingClient.sqm) : '');
      setRooms(editingClient.rooms || '');
      setFloor(editingClient.floor || '');
      setCondoFees(editingClient.condoFees > 0 ? String(editingClient.condoFees) : '');
      setAddress(editingClient.address || '');
      setHasElevator(!!editingClient.hasElevator);
      setHasBalcony(!!editingClient.hasBalcony);
      setHasGarage(!!editingClient.hasGarage);
      setStatus(editingClient.status || 'In corso');
      setReminderDate(editingClient.reminderDate ? String(editingClient.reminderDate).slice(0, 16) : '');
      setNote(getClientNote(editingClient));
      setTags(normalizeTags(editingClient.tags));
      setTagInput('');
      setHistory(normalizeHistory(editingClient.history));
      setHistoryDate(localDateTimeValue());
      setHistoryType('Chiamata');
      setHistoryNote('');
      setPhotos(getClientPhotos(editingClient));
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setRole('Acquirente');
      setPropertyType('Appartamento');
      setZone('');
      setPrice('');
      setSqm('');
      setRooms('');
      setFloor('');
      setCondoFees('');
      setAddress('');
      setHasElevator(false);
      setHasBalcony(false);
      setHasGarage(false);
      setStatus('In corso');
      setReminderDate('');
      setNote('');
      setTags([]);
      setTagInput('');
      setHistory([]);
      setHistoryDate(localDateTimeValue());
      setHistoryType('Chiamata');
      setHistoryNote('');
      setPhotos([]);
    }
  }, [isOpen, editingClient]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const remaining = MAX_PHOTOS_PER_CLIENT - photos.length;
    if (remaining <= 0) {
      setErrorMsg(
        isEn
          ? `You have already reached the maximum of ${MAX_PHOTOS_PER_CLIENT} images for this client.`
          : `Hai già raggiunto il massimo di ${MAX_PHOTOS_PER_CLIENT} immagini per questo cliente.`,
      );
      return;
    }

    const toProcess = files.slice(0, remaining);
    if (files.length > remaining) {
      onNotify(
        isEn
          ? `Too many photos selected: only the first ${remaining} were uploaded (max ${MAX_PHOTOS_PER_CLIENT}).`
          : `Selezionate troppe foto: caricate solo le prime ${remaining} (max ${MAX_PHOTOS_PER_CLIENT}).`,
        'error',
      );
    }

    const nextPhotos = [...photos];
    for (const file of toProcess) {
      try {
        const compressed = await compressImageFile(file);
        if (nextPhotos.length < MAX_PHOTOS_PER_CLIENT) {
          nextPhotos.push(compressed);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : isEn
              ? 'Unsupported format'
              : 'Formato non supportato';
        onNotify(
          isEn ? `Image skipped (${file.name}): ${message}` : `Immagine ignorata (${file.name}): ${message}`,
          'error',
        );
      }
    }
    setPhotos(nextPhotos);
  };

  const buildDraftRecord = (): ClientRecord => {
    const finalTags = tagInput.trim() ? addTagToList(tags, tagInput) : normalizeTags(tags);
    const trimmedPendingHistoryNote = historyNote.trim();
    const pendingHistoryEntry: ClientInteraction | null = trimmedPendingHistoryNote
      ? {
          id:
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: historyDate || localDateTimeValue(),
          type: historyType,
          note: trimmedPendingHistoryNote,
        }
      : null;
    const finalHistory = normalizeHistory(
      pendingHistoryEntry ? [pendingHistoryEntry, ...history] : history,
    );
    const finalPhotos = photos.slice(0, MAX_PHOTOS_PER_CLIENT);
    const id =
      editingClient?.id ||
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

    return {
      id,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      role,
      propertyType,
      zone: zone.trim(),
      price: price === '' || !Number.isFinite(Number(price)) ? 0 : Math.max(0, Number(price)),
      sqm: sqm === '' || !Number.isFinite(Number(sqm)) ? 0 : Math.max(0, Number(sqm)),
      rooms: rooms.trim(),
      floor: floor.trim(),
      condoFees:
        condoFees === '' || !Number.isFinite(Number(condoFees))
          ? 0
          : Math.max(0, Number(condoFees)),
      address: address.trim(),
      hasElevator,
      hasBalcony,
      hasGarage,
      status,
      reminderDate,
      note: note.trim(),
      notes: note.trim(),
      tags: finalTags,
      history: finalHistory,
      photoBase64: finalPhotos[0] || '',
      photos: finalPhotos,
      isFavorite: editingClient ? Boolean(editingClient.isFavorite) : false,
    };
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedPhone) {
      setErrorMsg(
        isEn ? 'Please enter full name and phone number.' : 'Inserisci nome e numero di telefono.',
      );
      return;
    }
    if (trimmedPhone.replace(/\D/g, '').length < 6) {
      setErrorMsg(
        isEn
          ? 'Please enter a valid phone number (at least 6 digits).'
          : 'Inserisci un numero di telefono valido (almeno 6 cifre).',
      );
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg(
        isEn
          ? 'Please enter a valid email address or leave the field blank.'
          : 'Inserisci un indirizzo email valido oppure lascia il campo vuoto.',
      );
      return;
    }

    if ([price, sqm, condoFees].some((v) => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0))) {
      setErrorMsg(
        isEn
          ? 'Price, area, and condo fees must be valid non-negative numbers.'
          : 'Prezzo, superficie e spese condominiali devono essere numeri validi e non negativi.',
      );
      return;
    }

    onSave(buildDraftRecord(), Boolean(editingClient));
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (tags.length >= MAX_TAGS_PER_CLIENT) {
      setErrorMsg(
        isEn
          ? `You can add up to ${MAX_TAGS_PER_CLIENT} tags per client.`
          : `Puoi inserire al massimo ${MAX_TAGS_PER_CLIENT} etichette per cliente.`,
      );
      return;
    }
    setTags((prev) => addTagToList(prev, tagInput));
    setTagInput('');
  };

  const handleTagInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleToggleSuggestedTag = (suggested: string) => {
    const exists = tags.some((t) => t.toLowerCase() === suggested.toLowerCase());
    if (exists) {
      setTags((prev) => removeTagFromList(prev, suggested));
      return;
    }
    if (tags.length >= MAX_TAGS_PER_CLIENT) {
      setErrorMsg(
        isEn
          ? `You can add up to ${MAX_TAGS_PER_CLIENT} tags per client.`
          : `Puoi inserire al massimo ${MAX_TAGS_PER_CLIENT} etichette per cliente.`,
      );
      return;
    }
    setTags((prev) => addTagToList(prev, suggested));
  };

  const handleAddHistoryEntry = () => {
    setErrorMsg(null);
    const trimmedNote = historyNote.trim();
    if (!trimmedNote) {
      setErrorMsg(
        isEn
          ? 'Please enter a short note to log the activity in history.'
          : "Inserisci una nota breve per registrare l'attività nello storico.",
      );
      return;
    }
    const newEntry: ClientInteraction = {
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: historyDate || localDateTimeValue(),
      type: historyType,
      note: trimmedNote,
    };
    setHistory((prev) => normalizeHistory([newEntry, ...prev]));
    setHistoryNote('');
    setHistoryDate(localDateTimeValue());
  };

  const handleHistoryKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddHistoryEntry();
    }
  };

  const handleRemoveHistoryEntry = (entryId: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== entryId));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-[#092b35]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-backdrop"
    >
      <div className="bg-white border border-[#cbe2de] w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden sm:my-auto flex flex-col max-h-[92vh] animate-bottom-sheet">
        <div className="px-6 py-4 border-b border-[#e1f0ed] flex items-center justify-between bg-[#f4faf9] sticky top-0 z-10">
          <h2 id="client-modal-title" className="text-base font-bold text-[#0e4d5f] flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#2eb086]" aria-hidden="true" />
            <span>
              {editingClient
                ? isEn
                  ? 'Edit Client Card'
                  : 'Modifica Scheda Cliente'
                : isEn
                  ? 'New Real Estate Client'
                  : 'Nuovo Cliente Immobiliare'}
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? 'Close client modal' : 'Chiudi finestra cliente'}
            className="p-1.5 rounded-lg text-[#5a808a] hover:text-[#0e4d5f] hover:bg-[#e1f0ed]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {errorMsg && (
            <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Section 1: Anagrafica */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#177858] uppercase tracking-wider">
              {isEn ? '1. Profile & Contact Details' : '1. Anagrafica e Contatti'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="field-name" className="block text-xs text-[#3b5e68] mb-1">
                  {isEn ? 'Full Name *' : 'Nome e Cognome *'}
                </label>
                <input
                  id="field-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isEn ? 'e.g. Marco Rossi' : 'Es. Marco Rossi'}
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
              </div>
              <div>
                <label htmlFor="field-phone" className="block text-xs text-[#3b5e68] mb-1">
                  {isEn ? 'Phone / Mobile *' : 'Telefono / Cellulare *'}
                </label>
                <input
                  id="field-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={isEn ? 'e.g. 3391234567' : 'Es. 3391234567'}
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
              </div>
              <div>
                <label htmlFor="field-email" className="block text-xs text-[#3b5e68] mb-1">
                  Email
                </label>
                <input
                  id="field-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="m.rossi@email.it"
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
              </div>
              <div>
                <label htmlFor="field-role" className="block text-xs text-[#3b5e68] mb-1">
                  {isEn ? 'Client Role *' : 'Ruolo Cliente *'}
                </label>
                <select
                  id="field-role"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value as ClientRole)}
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                >
                  <option value="Acquirente">
                    {isEn ? 'Buyer (Looking to buy)' : 'Acquirente (Cerca da comprare)'}
                  </option>
                  <option value="Venditore">
                    {isEn ? 'Seller (Owner)' : 'Venditore (Proprietario)'}
                  </option>
                  <option value="Inquilino">
                    {isEn ? 'Tenant (Looking to rent)' : 'Inquilino (Cerca in affitto)'}
                  </option>
                  <option value="Locatore">
                    {isEn ? 'Landlord (Renting property)' : 'Locatore (Affitta immobile)'}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-[#e1f0ed]" />

          {/* Section 2: Immobile */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#177858] uppercase tracking-wider">
              {isEn ? '2. Property / Search Criteria' : '2. Immobile / Parametri Ricerca'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="field-propertyType" className="block text-xs text-[#3b5e68] mb-1">
                  {isEn ? 'Property Type' : 'Tipologia Immobile'}
                </label>
                <select
                  id="field-propertyType"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                >
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {translatePropertyType(type, lang)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="field-zone" className="block text-xs text-[#3b5e68] mb-1">
                  {isEn ? 'Area / Neighborhood' : 'Zona / Quartiere'}
                </label>
                <input
                  id="field-zone"
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder={isEn ? 'e.g. City Center, Monza, Navigli...' : 'Es. Centro, Monza, Navigli...'}
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
              </div>
              <div>
                <label htmlFor="field-price" className="block text-xs text-[#3b5e68] mb-1">
                  {isEn ? 'Price / Budget (€)' : 'Prezzo / Budget (€)'}
                </label>
                <input
                  id="field-price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="250000"
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] tabular-nums focus:outline-none focus:border-[#2eb086]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="field-sqm" className="block text-xs text-[#3b5e68] mb-1">
                  {isEn ? 'Area (sqm)' : 'Superficie (m²)'}
                </label>
                <input
                  id="field-sqm"
                  type="number"
                  min={0}
                  value={sqm}
                  onChange={(e) => setSqm(e.target.value)}
                  placeholder="95"
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] tabular-nums focus:outline-none focus:border-[#2eb086]"
                />
              </div>
              <div>
                <label htmlFor="field-rooms" className="block text-xs text-[#3b5e68] mb-1">
                  {isEn ? 'Rooms' : 'Vani'}
                </label>
                <input
                  id="field-rooms"
                  type="text"
                  value={rooms}
                  onChange={(e) => setRooms(e.target.value)}
                  placeholder={isEn ? '3 rooms' : '3 locali'}
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
              </div>
              <div>
                <label htmlFor="field-floor" className="block text-xs text-[#3b5e68] mb-1">
                  {isEn ? 'Floor' : 'Piano'}
                </label>
                <input
                  id="field-floor"
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder={isEn ? '2nd floor' : '2° piano'}
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
              </div>
              <div>
                <label htmlFor="field-condoFees" className="block text-xs text-[#3b5e68] mb-1">
                  {isEn ? 'Condo Fees (€/mo)' : 'Spese Cond. (€/mese)'}
                </label>
                <input
                  id="field-condoFees"
                  type="number"
                  min={0}
                  value={condoFees}
                  onChange={(e) => setCondoFees(e.target.value)}
                  placeholder="120"
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] tabular-nums focus:outline-none focus:border-[#2eb086]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="field-address" className="block text-xs text-[#3b5e68] mb-1">
                {isEn ? 'Exact Address (For Google Maps)' : 'Indirizzo Esatto (Per Google Maps)'}
              </label>
              <input
                id="field-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Via Roma 15, Milano"
                className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
              />
            </div>

            <div className="flex flex-wrap gap-5 text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#3b5e68]">
                <input
                  type="checkbox"
                  checked={hasElevator}
                  onChange={(e) => setHasElevator(e.target.checked)}
                  className="rounded border-[#cbe2de] accent-[#2eb086]"
                />
                <span>{isEn ? 'Elevator' : 'Ascensore'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[#3b5e68]">
                <input
                  type="checkbox"
                  checked={hasBalcony}
                  onChange={(e) => setHasBalcony(e.target.checked)}
                  className="rounded border-[#cbe2de] accent-[#2eb086]"
                />
                <span>{isEn ? 'Balcony / Terrace' : 'Balcone / Terrazzo'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[#3b5e68]">
                <input
                  type="checkbox"
                  checked={hasGarage}
                  onChange={(e) => setHasGarage(e.target.checked)}
                  className="rounded border-[#cbe2de] accent-[#2eb086]"
                />
                <span>{isEn ? 'Garage / Parking' : 'Garage / Posto Auto'}</span>
              </label>
            </div>
          </div>

          <hr className="border-[#e1f0ed]" />

          {/* Section 3: Trattativa & Promemoria */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#177858] uppercase tracking-wider">
              {isEn ? '3. Deal Status & Reminders' : '3. Stato Trattativa e Promemoria'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="field-status" className="block text-xs text-[#3b5e68] mb-1">
                  {isEn ? 'Outcome / Status *' : 'Esito / Stato *'}
                </label>
                <select
                  id="field-status"
                  required
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ClientStatus)}
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                >
                  <option value="In corso">
                    {isEn ? 'In progress (First contact / Viewing)' : 'In corso (Primo contatto / Visita)'}
                  </option>
                  <option value="Trattativa">
                    {isEn ? 'Negotiation (Offer submitted)' : 'Trattativa (Proposta fatta)'}
                  </option>
                  <option value="Accettato">
                    {isEn ? 'Accepted (Closing / Won)' : 'Accettato (Rogito / Chiuso positivo)'}
                  </option>
                  <option value="Perso">
                    {isEn ? 'Lost (Deal fell through)' : 'Perso (Trattativa fallita)'}
                  </option>
                </select>
              </div>
              <div>
                <label htmlFor="field-reminderDate" className="block text-xs text-[#3b5e68] mb-1">
                  {isEn ? 'Next Follow-up Date & Time' : 'Data e Ora Prossimo Richiamo'}
                </label>
                <input
                  id="field-reminderDate"
                  type="datetime-local"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] tabular-nums focus:outline-none focus:border-[#2eb086]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="field-note" className="block text-xs text-[#3b5e68] mb-1">
                {isEn ? 'Notes' : 'Note'}
              </label>
              <textarea
                id="field-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  isEn
                    ? 'Client requirements, viewing outcome, price negotiability...'
                    : 'Esigenze cliente, esito visite, trattabilità prezzo...'
                }
                className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg p-3 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="field-tag-input" className="block text-xs text-[#3b5e68]">
                  {isEn
                    ? 'Custom Tags / Labels (e.g. investment, sea view, renovated)'
                    : 'Etichette / Tag Personalizzati (es. investimento, vista mare, ristrutturato)'}
                </label>
                <span className="text-xs font-semibold text-[#0e4d5f] font-mono tabular-nums">
                  {tags.length} / {MAX_TAGS_PER_CLIENT}
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag
                    className="w-3.5 h-3.5 text-[#5a808a] absolute left-3 top-2.5"
                    aria-hidden="true"
                  />
                  <input
                    id="field-tag-input"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder={
                      isEn ? 'Type a tag and press Enter...' : "Scrivi un'etichetta e premi Invio..."
                    }
                    className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg pl-8 pr-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-2 rounded-lg bg-[#eef6f5] hover:bg-[#dceceb] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isEn ? 'Add' : 'Aggiungi'}</span>
                </button>
              </div>

              {tags.length > 0 && (
                <div data-testid="form-tags-list" className="flex flex-wrap gap-1.5 pt-0.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0e4d5f] text-white text-xs font-medium"
                    >
                      <span>{translateSuggestedTag(tag, lang)}</span>
                      <button
                        type="button"
                        onClick={() => setTags((prev) => removeTagFromList(prev, tag))}
                        aria-label={isEn ? `Remove tag ${tag}` : `Rimuovi etichetta ${tag}`}
                        className="p-0.5 rounded hover:bg-white/20 transition-colors"
                      >
                        <X className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-[#5a808a] mr-0.5">
                  {isEn ? 'Suggested:' : 'Suggerite:'}
                </span>
                {SUGGESTED_CLIENT_TAGS.map((suggested) => {
                  const active = tags.some((t) => t.toLowerCase() === suggested.toLowerCase());
                  const displayTag = translateSuggestedTag(suggested, lang);
                  return (
                    <button
                      key={suggested}
                      type="button"
                      onClick={() => handleToggleSuggestedTag(suggested)}
                      aria-pressed={active}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                        active
                          ? 'bg-[#2eb086]/15 border-[#2eb086] text-[#177858]'
                          : 'bg-white border-[#cbe2de] text-[#4a707a] hover:bg-[#eef6f5] hover:text-[#0e4d5f]'
                      }`}
                    >
                      {active ? `✓ ${displayTag}` : `+ ${displayTag}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#177858] uppercase tracking-wider inline-flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isEn ? 'Activity & Contact History' : 'Storico Attività e Contatti'}</span>
                </span>
                <span className="text-xs font-semibold text-[#0e4d5f] font-mono tabular-nums">
                  {history.length}{' '}
                  {isEn ? (history.length === 1 ? 'activity' : 'activities') : 'attività'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#f4faf9] border border-[#cbe2de] space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="field-history-date" className="block text-[11px] text-[#3b5e68] mb-1">
                      {isEn ? 'Activity Date & Time' : 'Data e Ora Attività'}
                    </label>
                    <input
                      id="field-history-date"
                      type="datetime-local"
                      value={historyDate}
                      onChange={(e) => setHistoryDate(e.target.value)}
                      className="w-full bg-white border border-[#cbe2de] rounded-lg px-2.5 py-1.5 text-xs text-[#0f3b47] tabular-nums focus:outline-none focus:border-[#2eb086]"
                    />
                  </div>
                  <div>
                    <label htmlFor="field-history-type" className="block text-[11px] text-[#3b5e68] mb-1">
                      {isEn ? 'Contact Type' : 'Tipo Contatto'}
                    </label>
                    <select
                      id="field-history-type"
                      value={historyType}
                      onChange={(e) => setHistoryType(e.target.value as InteractionType)}
                      className="w-full bg-white border border-[#cbe2de] rounded-lg px-2.5 py-1.5 text-xs text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                    >
                      {VALID_INTERACTION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {translateInteractionType(t, lang)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label htmlFor="field-history-note" className="sr-only">
                      {isEn ? 'Short activity note' : 'Nota breve attività'}
                    </label>
                    <input
                      id="field-history-note"
                      type="text"
                      value={historyNote}
                      onChange={(e) => setHistoryNote(e.target.value)}
                      onKeyDown={handleHistoryKeyDown}
                      placeholder={
                        isEn
                          ? 'Short activity note (e.g. Confirmed viewing interest)'
                          : 'Nota breve attività (es. Confermato interesse visita)'
                      }
                      className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-1.5 text-xs text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddHistoryEntry}
                    className="px-3 py-1.5 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{isEn ? 'Add activity' : 'Aggiungi attività'}</span>
                  </button>
                </div>
              </div>

              {history.length === 0 ? (
                <p
                  data-testid="form-history-empty"
                  className="text-xs text-[#5a808a] italic px-1"
                >
                  {isEn
                    ? 'No activities logged for this client yet.'
                    : 'Nessuna attività registrata per questo cliente.'}
                </p>
              ) : (
                <ul
                  data-testid="form-history-list"
                  className="space-y-1.5 max-h-44 overflow-y-auto pr-1"
                >
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-white border border-[#cbe2de] text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-[#eef6f5] text-[#0e4d5f] font-semibold text-[11px]">
                            {translateInteractionType(entry.type, lang)}
                          </span>
                          <span className="text-[11px] text-[#5a808a] tabular-nums">
                            {formatInteractionDate(entry.date, lang)}
                          </span>
                        </div>
                        <p className="text-[#0f3b47] leading-snug">{entry.note}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveHistoryEntry(entry.id)}
                        aria-label={
                          isEn
                            ? `Remove activity ${entry.type} ${entry.note}`
                            : `Rimuovi attività ${entry.type} ${entry.note}`
                        }
                        title={isEn ? 'Remove activity' : 'Rimuovi attività'}
                        className="p-1 rounded-md text-[#5a808a] hover:text-rose-700 hover:bg-rose-50 shrink-0 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="field-photoFile" className="block text-xs text-[#3b5e68]">
                  {isEn
                    ? `Property Photos / Floor Plans (Up to ${MAX_PHOTOS_PER_CLIENT} images)`
                    : `Foto / Planimetrie Immobile (Fino a ${MAX_PHOTOS_PER_CLIENT} immagini)`}
                </label>
                <span className="text-xs font-semibold text-[#0e4d5f] font-mono tabular-nums">
                  {photos.length} / {MAX_PHOTOS_PER_CLIENT} {isEn ? 'photos' : 'foto'}
                </span>
              </div>
              <input
                id="field-photoFile"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="w-full text-xs text-[#4a707a] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#eef6f5] file:text-[#0e4d5f] hover:file:bg-[#dff0ed]"
              />

              {photos.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {photos.map((src, idx) => (
                      <div
                        key={`modal-photo-${idx}`}
                        className="relative rounded-lg overflow-hidden border border-[#cbe2de] bg-[#f4faf9]"
                      >
                        <LazyImage
                          src={src}
                          alt={isEn ? `Photo preview ${idx + 1}` : `Anteprima foto ${idx + 1}`}
                          wrapperClassName="w-full h-20 bg-[#f4faf9]"
                          className="w-full h-20 object-cover"
                        />
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#0e4d5f]/85 text-white text-[10px] font-bold">
                          {idx === 0 ? (isEn ? '1 (Primary)' : '1 (Principale)') : idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                          aria-label={isEn ? `Remove photo ${idx + 1}` : `Rimuovi foto ${idx + 1}`}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center hover:bg-rose-700"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotos([])}
                    className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium"
                  >
                    {isEn ? 'Remove all photos' : 'Rimuovi tutte le foto'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#e1f0ed] flex flex-wrap items-center justify-between gap-2">
            <div>
              {onDownloadPdf && editingClient && (
                <button
                  type="button"
                  onClick={() => onDownloadPdf(buildDraftRecord())}
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5 text-[#2eb086]" aria-hidden="true" />
                  <span>{isEn ? 'Download PDF' : 'Scarica PDF'}</span>
                </button>
              )}
            </div>
            <div className="flex justify-end gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#eef6f5] hover:bg-[#dceceb] text-[#3b5e68] text-xs font-semibold"
              >
                {isEn ? 'Cancel' : 'Annulla'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold"
              >
                {isEn ? 'Save Client Card' : 'Salva Scheda Cliente'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
