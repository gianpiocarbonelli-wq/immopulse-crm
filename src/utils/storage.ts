import type { AgencyWorkspaceConfig, ClientRecord, UserAccount } from '../types/crm';

export const STORAGE_KEY = 'agenda_crm_immobiliare_clients_v2';
export const ACCOUNTS_KEY = 'immopulse_accounts_v1';
export const SESSION_KEY = 'immopulse_session_v1';
export const AGENCY_WORKSPACE_KEY = 'immopulse_agency_workspace_v1';

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
