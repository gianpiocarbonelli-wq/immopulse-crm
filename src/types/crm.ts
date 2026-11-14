export type ClientRole = 'Acquirente' | 'Venditore' | 'Inquilino' | 'Locatore';

export type ClientStatus = 'In corso' | 'Trattativa' | 'Accettato' | 'Perso';

export type PlanTier = 'free' | 'basic' | 'full' | 'agency';
export type PaidPlanTier = 'basic' | 'full' | 'agency';

export type SortOption = 'default' | 'name-asc' | 'price-desc' | 'price-asc' | 'reminder-asc';

export type ActiveTab = 'all' | 'dashboard' | 'reminders' | 'matching';

export type PaymentMethodType = 'digital' | 'card' | 'prepaid';

export type InteractionType = 'Chiamata' | 'Visita' | 'WhatsApp' | 'Email' | 'Nota';

export interface ClientInteraction {
  id: string;
  date: string;
  type: InteractionType;
  note: string;
}

export interface UpcomingDayBucket {
  dateKey: string;
  shortLabel: string;
  fullLabel: string;
  count: number;
  clients: ClientRecord[];
}

export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: ClientRole;
  propertyType: string;
  zone: string;
  address: string;
  price: number;
  sqm: number;
  rooms: string;
  floor: string;
  condoFees: number;
  hasElevator: boolean;
  hasBalcony: boolean;
  hasGarage: boolean;
  status: ClientStatus;
  reminderDate: string;
  note: string;
  notes?: string;
  tags: string[];
  history: ClientInteraction[];
  photoBase64: string;
  photos: string[];
  isFavorite?: boolean;
}

export interface UserAccount {
  name: string;
  email: string;
  password: string;
  plan: PlanTier;
  paymentMethod: string;
  activatedAt: string;
  agencyCode?: string;
  agencyName?: string;
}

export type AgencyConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface AgencyMember {
  connectionId: string;
  agentName: string;
  deviceLabel: string;
  joinedAt: string;
}

export interface AgencyWorkspaceConfig {
  agencyCode: string;
  agencyName: string;
  agentName: string;
  deviceLabel: string;
}

export interface AgencyActivityEvent {
  id: string;
  timestamp: string;
  agentName: string;
  deviceLabel: string;
  action: string;
}

export interface ClientFilters {
  query: string;
  status: string;
  role: string;
  tag?: string;
  sortBy: SortOption;
  favoritesOnly?: boolean;
  minPrice?: number | null;
  maxPrice?: number | null;
  withPhotosOnly?: boolean;
}

export interface CrmMetrics {
  total: number;
  active: number;
  won: number;
  lost: number;
  remindersDue: number;
  conversionRate: number;
}

export interface MatchResult {
  buyer: ClientRecord;
  score: number;
  reasons: string[];
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
}
