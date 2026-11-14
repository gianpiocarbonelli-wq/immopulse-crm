import test from 'node:test';
import assert from 'node:assert/strict';
import { AgencyHub, normalizeServerAgencyCode } from './agencyHub.ts';

test('AgencyHub creates rooms, enforces idempotent upserts, tracks presence, and syncs across agents', () => {
  const hub = new AgencyHub(null);
  assert.equal(normalizeServerAgencyCode('  rossi & co 2026! '), 'ROSSI-CO-2026');

  const initialClient = {
    id: 'c-1',
    name: 'Marco Rossi',
    phone: '3391234567',
    role: 'Acquirente',
    status: 'In corso',
    price: 250000,
    tags: ['vista mare'],
    history: [],
  };

  // Agent A creates/joins room
  const joinA = hub.joinRoom({
    agencyCode: 'rossi-2026',
    agencyName: 'Agenzia Rossi',
    connectionId: 'conn-a',
    agentName: 'Marco',
    deviceLabel: 'Mac · Chrome',
    initialClients: [initialClient],
  });
  assert.ok(joinA);
  assert.equal(joinA.room.agencyCode, 'ROSSI-2026');
  assert.equal(joinA.room.clients.length, 1);
  assert.equal(joinA.members.length, 1);

  // Agent B joins same room (initialClients must NOT overwrite existing room state)
  const joinB = hub.joinRoom({
    agencyCode: 'ROSSI-2026',
    connectionId: 'conn-b',
    agentName: 'Elena',
    deviceLabel: 'iOS · Safari',
    initialClients: [
      {
        id: 'stale-local',
        name: 'Stale Local',
        phone: '3330000000',
        role: 'Venditore',
        status: 'Perso',
      },
    ],
  });
  assert.ok(joinB);
  assert.equal(joinB.room.clients.length, 1);
  assert.equal(joinB.room.clients[0].id, 'c-1');
  assert.equal(joinB.members.length, 2);

  // Idempotent create + duplicate broadcast guard
  const upsert1 = hub.upsertClient({
    agencyCode: 'ROSSI-2026',
    agentName: 'Elena',
    deviceLabel: 'iOS · Safari',
    rawClient: {
      id: 'c-2',
      name: 'Giulia Verdi',
      phone: '3389998877',
      role: 'Venditore',
      status: 'Trattativa',
    },
  });
  const upsertDup = hub.upsertClient({
    agencyCode: 'ROSSI-2026',
    agentName: 'Elena',
    deviceLabel: 'iOS · Safari',
    rawClient: {
      id: 'c-2',
      name: 'Giulia Verdi',
      phone: '3389998877',
      role: 'Venditore',
      status: 'Accettato',
    },
  });
  assert.ok(upsert1 && upsertDup);
  assert.equal(joinB.room.clients.length, 2);
  assert.equal(joinB.room.clients[0].status, 'Accettato');

  // Delete + idempotent second delete
  const del1 = hub.deleteClient({
    agencyCode: 'ROSSI-2026',
    clientId: 'c-1',
    agentName: 'Marco',
    deviceLabel: 'Mac · Chrome',
  });
  const del2 = hub.deleteClient({
    agencyCode: 'ROSSI-2026',
    clientId: 'c-1',
    agentName: 'Marco',
    deviceLabel: 'Mac · Chrome',
  });
  assert.ok(del1 && del1.event !== null);
  assert.ok(del2 && del2.event === null);
  assert.equal(joinB.room.clients.length, 1);

  // Leave presence
  const remaining = hub.leaveRoom('ROSSI-2026', 'conn-b');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].agentName, 'Marco');
});
