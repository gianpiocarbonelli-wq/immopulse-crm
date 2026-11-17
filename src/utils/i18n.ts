import type { ClientRole, ClientStatus, InteractionType } from '../types/crm';

export type AppLanguage = 'it' | 'en';

export function getLocale(lang: AppLanguage): string {
  return lang === 'en' ? 'en-US' : 'it-IT';
}

const ROLE_EN: Record<ClientRole, string> = {
  Acquirente: 'Buyer',
  Venditore: 'Seller',
  Inquilino: 'Tenant',
  Locatore: 'Landlord',
};

const STATUS_EN: Record<ClientStatus, string> = {
  'In corso': 'In progress',
  Trattativa: 'Negotiation',
  Accettato: 'Accepted',
  Perso: 'Lost',
};

const PROPERTY_TYPE_EN: Record<string, string> = {
  Appartamento: 'Apartment',
  Attico: 'Penthouse',
  Villa: 'Villa',
  'Locale Commerciale': 'Commercial Unit',
  Terreno: 'Land',
  Box: 'Garage / Box',
};

const INTERACTION_TYPE_EN: Record<InteractionType, string> = {
  Chiamata: 'Call',
  Visita: 'Viewing',
  WhatsApp: 'WhatsApp',
  Email: 'Email',
  Nota: 'Note',
};

const SUGGESTED_TAG_EN: Record<string, string> = {
  investimento: 'investment',
  'vista mare': 'sea view',
  ristrutturato: 'renovated',
  terrazzo: 'terrace',
  luminoso: 'bright',
  'prima casa': 'first home',
  giardino: 'garden',
  'nuova costruzione': 'new build',
};

const PORTAL_FEATURE_EN: Record<string, string> = {
  Terrazzo: 'Terrace',
  Giardino: 'Garden',
  Ascensore: 'Elevator',
  'Box / Garage': 'Garage / Parking',
  Arredato: 'Furnished',
  Ristrutturato: 'Renovated',
  'Nuova costruzione': 'New build',
  'Classe A': 'Energy Class A',
  'Vista mare': 'Sea view',
  Climatizzato: 'Air conditioned',
  Cantina: 'Cellar / Storage',
  'Piano alto': 'High floor',
};

const CONDITION_EN: Record<string, string> = {
  'Nuovo / Classe A': 'New / Class A',
  Ristrutturato: 'Renovated',
  'Ottimo stato': 'Excellent condition',
  'Buono / Abitabile': 'Good / Habitable',
  'Da ristrutturare': 'To renovate',
};

export function translateRole(role: ClientRole | string, lang: AppLanguage): string {
  if (lang === 'it') return role;
  return ROLE_EN[role as ClientRole] ?? role;
}

export function translateStatus(status: ClientStatus | string, lang: AppLanguage): string {
  if (lang === 'it') return status;
  return STATUS_EN[status as ClientStatus] ?? status;
}

export function translatePropertyType(type: string, lang: AppLanguage): string {
  if (lang === 'it') return type;
  return PROPERTY_TYPE_EN[type] ?? type;
}

export function translateInteractionType(type: InteractionType | string, lang: AppLanguage): string {
  if (lang === 'it') return type;
  return INTERACTION_TYPE_EN[type as InteractionType] ?? type;
}

export function translateSuggestedTag(tag: string, lang: AppLanguage): string {
  if (lang === 'it') return tag;
  return SUGGESTED_TAG_EN[tag.toLowerCase()] ?? tag;
}

export function translatePortalFeature(feature: string, lang: AppLanguage): string {
  if (lang === 'it') return feature;
  return PORTAL_FEATURE_EN[feature] ?? feature;
}

export function translatePropertyCondition(cond: string, lang: AppLanguage): string {
  if (lang === 'it') return cond;
  return CONDITION_EN[cond] ?? cond;
}
