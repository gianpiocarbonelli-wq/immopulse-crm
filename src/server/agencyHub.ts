import fs from 'node:fs';
import path from 'node:path';
import type {
  AgencyActivityEvent,
  AgencyMember,
  ClientRecord,
} from '../types/crm.ts';

export interface AgencyRoomRecord {
  agencyCode: string;
  agencyName: string;
  clients: ClientRecord[];
  recentEvents: AgencyActivityEvent[];
  updatedAt: string;
}

interface PersistedRoomsFile {
  rooms: Record<string, AgencyRoomRecord>;
}

const VALID_ROLES = new Set(['Acquirente', 'Venditore', 'Inquilino', 'Locatore']);
const VALID_STATUSES = new Set(['In corso', 'Trattativa', 'Accettato', 'Perso']);
const VALID_INTERACTION_TYPES = new Set(['Chiamata', 'Visita', 'WhatsApp', 'Email', 'Nota']);

export function normalizeServerAgencyCode(raw: unknown): string {
  return String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function sanitizeServerClient(raw: unknown): ClientRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const c = raw as Record<string, unknown>;
  const id =
    typeof c.id === 'string' && c.id.trim()
      ? c.id.trim()
      : typeof c.id === 'number' && Number.isFinite(c.id)
        ? String(c.id)
        : '';
  const name = typeof c.name === 'string' ? c.name.trim() : '';
  const phone = typeof c.phone === 'string' ? c.phone.trim() : '';
  const role = typeof c.role === 'string' && VALID_ROLES.has(c.role) ? (c.role as ClientRecord['role']) : null;
  const status =
    typeof c.status === 'string' && VALID_STATUSES.has(c.status) ? (c.status as ClientRecord['status']) : null;

  if (!id || !name || !role || !status) return null;

  const toNum = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const photos = Array.isArray(c.photos)
    ? c.photos.filter((p): p is string => typeof p === 'string' && p.startsWith('data:image/')).slice(0, 7)
    : typeof c.photoBase64 === 'string' && c.photoBase64.startsWith('data:image/')
      ? [c.photoBase64]
      : [];

  const seenTags = new Set<string>();
  const tags: string[] = [];
  if (Array.isArray(c.tags)) {
    for (const t of c.tags) {
      if (typeof t !== 'string') continue;
      const clean = t.trim().replace(/\s+/g, ' ').slice(0, 32);
      if (!clean) continue;
      const k = clean.toLowerCase();
      if (seenTags.has(k)) continue;
      seenTags.add(k);
      tags.push(clean);
      if (tags.length >= 12) break;
    }
  }

  const history: ClientRecord['history'] = [];
  if (Array.isArray(c.history)) {
    for (let i = 0; i < c.history.length; i++) {
      const h = c.history[i];
      if (!h || typeof h !== 'object' || Array.isArray(h)) continue;
      const rec = h as Record<string, unknown>;
      const date = typeof rec.date === 'string' ? rec.date.trim() : '';
      const note = typeof rec.note === 'string' ? rec.note.trim() : '';
      if (!date && !note) continue;
      const type =
        typeof rec.type === 'string' && VALID_INTERACTION_TYPES.has(rec.type)
          ? (rec.type as ClientRecord['history'][number]['type'])
          : 'Nota';
      const hid =
        typeof rec.id === 'string' && rec.id.trim()
          ? rec.id.trim()
          : `hist-${i}-${date || 'undated'}`;
      history.push({ id: hid, date, type, note });
    }
    history.sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : NaN;
      const tb = b.date ? new Date(b.date).getTime() : NaN;
      if (!Number.isNaN(ta) && !Number.isNaN(tb)) return tb - ta;
      if (!Number.isNaN(tb)) return 1;
      if (!Number.isNaN(ta)) return -1;
      return 0;
    });
  }

  const noteText =
    typeof c.note === 'string' && c.note.trim()
      ? c.note.trim()
      : typeof c.notes === 'string'
        ? c.notes.trim()
        : '';

  return {
    id,
    name,
    phone,
    email: typeof c.email === 'string' ? c.email.trim() : '',
    role,
    propertyType:
      typeof c.propertyType === 'string' && c.propertyType.trim()
        ? c.propertyType.trim()
        : 'Appartamento',
    zone: typeof c.zone === 'string' ? c.zone.trim() : '',
    address: typeof c.address === 'string' ? c.address.trim() : '',
    price: toNum(c.price),
    sqm: toNum(c.sqm),
    rooms: typeof c.rooms === 'string' ? c.rooms.trim() : '',
    floor: typeof c.floor === 'string' ? c.floor.trim() : '',
    condoFees: toNum(c.condoFees),
    hasElevator: Boolean(c.hasElevator),
    hasBalcony: Boolean(c.hasBalcony),
    hasGarage: Boolean(c.hasGarage),
    status,
    reminderDate: typeof c.reminderDate === 'string' ? c.reminderDate : '',
    note: noteText,
    notes: noteText,
    tags,
    history,
    photoBase64: photos[0] || '',
    photos,
    isFavorite: Boolean(c.isFavorite),
  };
}

export class AgencyHub {
  private rooms = new Map<string, AgencyRoomRecord>();
  private presence = new Map<string, Map<string, AgencyMember>>();
  private storageFile: string | null;

  constructor(storageFile: string | null = null) {
    this.storageFile = storageFile;
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (!this.storageFile) return;
    try {
      if (!fs.existsSync(this.storageFile)) return;
      const raw = fs.readFileSync(this.storageFile, 'utf8');
      const parsed = JSON.parse(raw) as PersistedRoomsFile | null;
      if (!parsed || typeof parsed.rooms !== 'object' || !parsed.rooms) return;
      for (const [code, room] of Object.entries(parsed.rooms)) {
        const normalizedCode = normalizeServerAgencyCode(code);
        if (!normalizedCode || !room) continue;
        const clients = Array.isArray(room.clients)
          ? room.clients.map(sanitizeServerClient).filter((c): c is ClientRecord => c !== null)
          : [];
        this.rooms.set(normalizedCode, {
          agencyCode: normalizedCode,
          agencyName: typeof room.agencyName === 'string' ? room.agencyName : normalizedCode,
          clients,
          recentEvents: Array.isArray(room.recentEvents) ? room.recentEvents.slice(0, 20) : [],
          updatedAt: typeof room.updatedAt === 'string' ? room.updatedAt : new Date().toISOString(),
        });
      }
    } catch {
      // Ignore corrupt persistence file and start fresh
    }
  }

  private saveToDisk(): void {
    if (!this.storageFile) return;
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const roomsObj: Record<string, AgencyRoomRecord> = {};
      for (const [code, room] of this.rooms.entries()) {
        roomsObj[code] = room;
      }
      fs.writeFileSync(this.storageFile, JSON.stringify({ rooms: roomsObj }, null, 2), 'utf8');
    } catch {
      // Non-fatal disk persistence warning
    }
  }

  private pushEvent(
    room: AgencyRoomRecord,
    agentName: string,
    deviceLabel: string,
    action: string,
  ): AgencyActivityEvent {
    const event: AgencyActivityEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      agentName: agentName.trim() || 'Agente',
      deviceLabel: deviceLabel.trim() || 'Dispositivo',
      action,
    };
    room.recentEvents = [event, ...room.recentEvents].slice(0, 20);
    room.updatedAt = event.timestamp;
    return event;
  }

  joinRoom(params: {
    agencyCode: string;
    agencyName?: string;
    connectionId: string;
    agentName: string;
    deviceLabel: string;
    initialClients?: unknown[];
  }): {
    room: AgencyRoomRecord;
    members: AgencyMember[];
    joinEvent: AgencyActivityEvent;
  } | null {
    const code = normalizeServerAgencyCode(params.agencyCode);
    if (!code) return null;

    let room = this.rooms.get(code);
    if (!room) {
      const seedClients = Array.isArray(params.initialClients)
        ? params.initialClients
            .map(sanitizeServerClient)
            .filter((c): c is ClientRecord => c !== null)
        : [];
      room = {
        agencyCode: code,
        agencyName: (params.agencyName || '').trim() || `Agenzia ${code}`,
        clients: seedClients,
        recentEvents: [],
        updatedAt: new Date().toISOString(),
      };
      this.rooms.set(code, room);
    } else if (params.agencyName && params.agencyName.trim() && room.agencyName === `Agenzia ${code}`) {
      room.agencyName = params.agencyName.trim();
    }

    let roomPresence = this.presence.get(code);
    if (!roomPresence) {
      roomPresence = new Map();
      this.presence.set(code, roomPresence);
    }
    const member: AgencyMember = {
      connectionId: params.connectionId,
      agentName: params.agentName.trim() || 'Agente',
      deviceLabel: params.deviceLabel.trim() || 'Dispositivo',
      joinedAt: new Date().toISOString(),
    };
    roomPresence.set(params.connectionId, member);

    const joinEvent = this.pushEvent(
      room,
      member.agentName,
      member.deviceLabel,
      `Dispositivo collegato (${member.deviceLabel})`,
    );
    this.saveToDisk();

    return {
      room,
      members: this.getMembers(code),
      joinEvent,
    };
  }

  leaveRoom(agencyCode: string, connectionId: string): AgencyMember[] {
    const code = normalizeServerAgencyCode(agencyCode);
    if (!code) return [];
    const roomPresence = this.presence.get(code);
    if (!roomPresence) return [];
    roomPresence.delete(connectionId);
    return this.getMembers(code);
  }

  getMembers(agencyCode: string): AgencyMember[] {
    const code = normalizeServerAgencyCode(agencyCode);
    const roomPresence = this.presence.get(code);
    return roomPresence ? Array.from(roomPresence.values()) : [];
  }

  getRoomInfo(agencyCode: string): { exists: boolean; agencyName: string; clientCount: number; activeDevices: number } {
    const code = normalizeServerAgencyCode(agencyCode);
    const room = this.rooms.get(code);
    if (!room) {
      return { exists: false, agencyName: '', clientCount: 0, activeDevices: 0 };
    }
    return {
      exists: true,
      agencyName: room.agencyName,
      clientCount: room.clients.length,
      activeDevices: this.getMembers(code).length,
    };
  }

  upsertClient(params: {
    agencyCode: string;
    rawClient: unknown;
    agentName: string;
    deviceLabel: string;
  }): { client: ClientRecord; event: AgencyActivityEvent } | null {
    const code = normalizeServerAgencyCode(params.agencyCode);
    const room = this.rooms.get(code);
    if (!room) return null;

    const cleanClient = sanitizeServerClient(params.rawClient);
    if (!cleanClient) return null;

    const exists = room.clients.some((c) => String(c.id) === String(cleanClient.id));
    room.clients = exists
      ? room.clients.map((c) => (String(c.id) === String(cleanClient.id) ? cleanClient : c))
      : [cleanClient, ...room.clients];

    const action = exists
      ? `Ha aggiornato la scheda di ${cleanClient.name}`
      : `Ha aggiunto il nuovo cliente ${cleanClient.name}`;
    const event = this.pushEvent(room, params.agentName, params.deviceLabel, action);
    this.saveToDisk();

    return { client: cleanClient, event };
  }

  deleteClient(params: {
    agencyCode: string;
    clientId: string;
    agentName: string;
    deviceLabel: string;
  }): { clientId: string; event: AgencyActivityEvent | null } | null {
    const code = normalizeServerAgencyCode(params.agencyCode);
    const room = this.rooms.get(code);
    if (!room) return null;

    const targetId = String(params.clientId);
    const existing = room.clients.find((c) => String(c.id) === targetId);
    if (!existing) {
      return { clientId: targetId, event: null };
    }

    room.clients = room.clients.filter((c) => String(c.id) !== targetId);
    const event = this.pushEvent(
      room,
      params.agentName,
      params.deviceLabel,
      `Ha eliminato la scheda di ${existing.name}`,
    );
    this.saveToDisk();

    return { clientId: targetId, event };
  }

  replaceClients(params: {
    agencyCode: string;
    rawClients: unknown[];
    agentName: string;
    deviceLabel: string;
    reason?: string;
  }): { room: AgencyRoomRecord; event: AgencyActivityEvent } | null {
    const code = normalizeServerAgencyCode(params.agencyCode);
    const room = this.rooms.get(code);
    if (!room || !Array.isArray(params.rawClients)) return null;

    const cleanClients = params.rawClients
      .map(sanitizeServerClient)
      .filter((c): c is ClientRecord => c !== null);

    room.clients = cleanClients;
    const action =
      params.reason || `Ha sincronizzato l'archivio (${cleanClients.length} schede)`;
    const event = this.pushEvent(room, params.agentName, params.deviceLabel, action);
    this.saveToDisk();

    return { room, event };
  }
}
