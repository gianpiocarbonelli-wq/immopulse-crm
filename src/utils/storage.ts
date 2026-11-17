import type {
  AgencyWorkspaceConfig,
  ClientRecord,
  PropertyPortalConfig,
  SavedPortalSearch,
  UserAccount,
} from '../types/crm';
import {
  EMPTY_PORTAL_FILTERS,
  cloneDefaultPortals,
  normalizeCustomFeatures,
  sanitizePortalsList,
} from './portalSearch';

export const STORAGE_KEY = 'agenda_crm_immobiliare_clients_v2';
export const ACCOUNTS_KEY = 'immopulse_accounts_v1';
export const SESSION_KEY = 'immopulse_session_v1';
export const AGENCY_WORKSPACE_KEY = 'immopulse_agency_workspace_v1';
export const PORTALS_KEY = 'immopulse_portals_v2';
export const CUSTOM_FILTERS_KEY = 'immopulse_custom_filters_v1';
export const SAVED_SEARCHES_KEY = 'immopulse_saved_searches_v1';
export const LANGUAGE_KEY = 'immopulse_language_v1';
export const LICENSE_KEY = 'immopulse_license_code_v1';
export const PRO_ACTIVE_KEY = 'immopulse_pro_active';
export const PRO_ACTIVATED_AT_KEY = 'immopulse_pro_activated_at';

const memoryStorage: Record<string, string> = {};

export function safeStorageGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Fallback to in-memory store when localStorage is blocked
  }
  return Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null;
}

export function safeStorageSet(key: string, val: string): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, val);
      return true;
    }
  } catch (err: unknown) {
    const e = err as { name?: string; code?: number } | null;
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      return false;
    }
  }
  memoryStorage[key] = val;
  return true;
}

export function safeStorageRemove(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore restricted localStorage errors
  }
  delete memoryStorage[key];
}

export function getAccounts(): UserAccount[] {
  try {
    const raw = safeStorageGet(ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: UserAccount[]): boolean {
  return safeStorageSet(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function loadSessionEmail(): string | null {
  return safeStorageGet(SESSION_KEY);
}

export function saveSessionEmail(email: string): boolean {
  return safeStorageSet(SESSION_KEY, email);
}

export function clearSessionEmail(): void {
  safeStorageRemove(SESSION_KEY);
}

export function loadStoredClientsRaw(): string | null {
  return safeStorageGet(STORAGE_KEY);
}

export function saveStoredClients(clients: ClientRecord[]): boolean {
  return safeStorageSet(STORAGE_KEY, JSON.stringify(clients));
}

export function loadAgencyWorkspace(): AgencyWorkspaceConfig | null {
  try {
    const raw = safeStorageGet(AGENCY_WORKSPACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AgencyWorkspaceConfig> | null;
    if (!parsed || typeof parsed.agencyCode !== 'string' || !parsed.agencyCode.trim()) {
      return null;
    }
    return {
      agencyCode: parsed.agencyCode.trim(),
      agencyName: typeof parsed.agencyName === 'string' ? parsed.agencyName.trim() : '',
      agentName: typeof parsed.agentName === 'string' ? parsed.agentName.trim() : '',
      deviceLabel: typeof parsed.deviceLabel === 'string' ? parsed.deviceLabel.trim() : '',
    };
  } catch {
    return null;
  }
}

export function saveAgencyWorkspace(config: AgencyWorkspaceConfig): boolean {
  return safeStorageSet(AGENCY_WORKSPACE_KEY, JSON.stringify(config));
}

export function clearAgencyWorkspace(): void {
  safeStorageRemove(AGENCY_WORKSPACE_KEY);
}

export function loadPortals(): PropertyPortalConfig[] {
  try {
    const raw = safeStorageGet(PORTALS_KEY);
    if (!raw) return cloneDefaultPortals();
    return sanitizePortalsList(JSON.parse(raw));
  } catch {
    return cloneDefaultPortals();
  }
}

export function savePortals(portals: PropertyPortalConfig[]): boolean {
  return safeStorageSet(PORTALS_KEY, JSON.stringify(portals));
}

export function loadCustomPortalFilters(): string[] {
  try {
    const raw = safeStorageGet(CUSTOM_FILTERS_KEY);
    if (!raw) return [];
    return normalizeCustomFeatures(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveCustomPortalFilters(features: string[]): boolean {
  return safeStorageSet(CUSTOM_FILTERS_KEY, JSON.stringify(normalizeCustomFeatures(features)));
}

export function loadSavedPortalSearches(): SavedPortalSearch[] {
  try {
    const raw = safeStorageGet(SAVED_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SavedPortalSearch =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          Boolean(item.filters) &&
          typeof item.filters === 'object',
      )
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        query: typeof item.query === 'string' ? item.query : '',
        filters: {
          ...EMPTY_PORTAL_FILTERS,
          ...item.filters,
          customFeatures: normalizeCustomFeatures(item.filters.customFeatures),
        },
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
      }))
      .slice(0, 12);
  } catch {
    return [];
  }
}

export function saveSavedPortalSearches(searches: SavedPortalSearch[]): boolean {
  return safeStorageSet(SAVED_SEARCHES_KEY, JSON.stringify(searches.slice(0, 12)));
}

export function loadSavedLanguage(): 'it' | 'en' {
  return safeStorageGet(LANGUAGE_KEY) === 'en' ? 'en' : 'it';
}

export function saveLanguage(lang: 'it' | 'en'): boolean {
  return safeStorageSet(LANGUAGE_KEY, lang);
}

export function loadSavedLicenseCode(): string | null {
  const raw = safeStorageGet(LICENSE_KEY);
  return raw && raw.trim() ? raw.trim() : null;
}

export function saveLicenseCode(code: string): boolean {
  return safeStorageSet(LICENSE_KEY, code.trim().toUpperCase());
}

export function clearLicenseCode(): void {
  safeStorageRemove(LICENSE_KEY);
}

export function loadProActiveFlag(): { active: boolean; activatedAt: string | null } {
  return {
    active: safeStorageGet(PRO_ACTIVE_KEY) === 'true',
    activatedAt: safeStorageGet(PRO_ACTIVATED_AT_KEY),
  };
}

export function saveProActiveFlag(activatedAtIso: string = new Date().toISOString()): boolean {
  const okFlag = safeStorageSet(PRO_ACTIVE_KEY, 'true');
  const okDate = safeStorageSet(PRO_ACTIVATED_AT_KEY, activatedAtIso);
  return okFlag && okDate;
}

export function clearProActiveFlag(): void {
  safeStorageRemove(PRO_ACTIVE_KEY);
  safeStorageRemove(PRO_ACTIVATED_AT_KEY);
}
