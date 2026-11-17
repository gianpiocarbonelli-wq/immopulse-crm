export type ClientRole = 'Acquirente' | 'Venditore' | 'Inquilino' | 'Locatore';

export type ClientStatus = 'In corso' | 'Trattativa' | 'Accettato' | 'Perso';

export type PlanTier = 'free' | 'pro' | 'agency';
export type PaidPlanTier = 'pro' | 'agency';

export type SortOption = 'default' | 'name-asc' | 'price-desc' | 'price-asc' | 'reminder-asc';

export type ActiveTab = 'all' | 'dashboard' | 'reminders' | 'matching' | 'find';

export interface PropertyPortalConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  isCustom?: boolean;
}

export interface GroundedSource {
  title: string;
  uri: string;
  domain?: string;
}

export interface ChatbotMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: GroundedSource[];
  timestamp: string;
}

export interface PropertyValuationInput {
  city: string;
  zone: string;
  propertyType: string;
  sqm: number;
  rooms?: string;
  condition?: string;
  floor?: string;
  notes?: string;
}

export interface PortalSearchFilters {
  contract: 'tutti' | 'vendita' | 'affitto';
  propertyType: string;
  cityZone: string;
  minPrice: string;
  maxPrice: string;
  minSqm: string;
  minRooms: string;
  customFeatures?: string[];
}

export interface SavedPortalSearch {
  id: string;
  name: string;
  query: string;
  filters: PortalSearchFilters;
  createdAt: string;
}

export interface PortalSearchResultItem {
  title: string;
  uri: string;
  domain: string;
  portalName?: string;
}

export interface PortalSearchResponse {
  summary: string;
  results: PortalSearchResultItem[];
}

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

export type BillingCycle = 'monthly' | 'annual';

export type SubscriptionPhase = 'free' | 'active' | 'expiring_soon' | 'expired';

export interface SubscriptionStatus {
  phase: SubscriptionPhase;
  plan: PlanTier;
  expiresAt: string | null;
  daysRemaining: number | null;
  billingCycle: BillingCycle;
  expiredFromPlan?: PaidPlanTier;
}

export interface UserAccount {
  name: string;
  email: string;
  password: string;
  plan: PlanTier;
  billingCycle?: BillingCycle;
  paymentMethod: string;
  activatedAt: string;
  expiresAt?: string;
  expiredFromPlan?: PaidPlanTier;
  expiredAt?: string;
  agencyCode?: string;
  agencyName?: string;
  licenseCode?: string;
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
