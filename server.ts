import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { AgencyHub, normalizeServerAgencyCode } from './src/server/agencyHub.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  const hub = new AgencyHub(path.resolve(__dirname, '.data', 'agency-rooms.json'));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/agency/:code', (req, res) => {
    const code = normalizeServerAgencyCode(req.params.code);
    if (!code) {
      res.status(400).json({ error: 'Codice agenzia non valido.' });
      return;
    }
    res.json(hub.getRoomInfo(code));
  });

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/agency' });

  interface SocketMeta {
    connectionId: string;
    agencyCode: string | null;
    agentName: string;
    deviceLabel: string;
  }

  const socketMeta = new WeakMap<WebSocket, SocketMeta>();
  const roomSockets = new Map<string, Set<WebSocket>>();

  const sendJson = (ws: WebSocket, payload: unknown) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  const broadcastToRoom = (agencyCode: string, payload: unknown, exclude?: WebSocket) => {
    const set = roomSockets.get(agencyCode);
    if (!set) return;
    const encoded = JSON.stringify(payload);
    for (const clientWs of set) {
      if (exclude && clientWs === exclude) continue;
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(encoded);
      }
    }
  };

  const detachFromCurrentRoom = (ws: WebSocket) => {
    const meta = socketMeta.get(ws);
    if (!meta || !meta.agencyCode) return;
    const code = meta.agencyCode;
    const set = roomSockets.get(code);
    if (set) {
      set.delete(ws);
      if (set.size === 0) roomSockets.delete(code);
    }
    const members = hub.leaveRoom(code, meta.connectionId);
    meta.agencyCode = null;
    broadcastToRoom(code, { type: 'presence:update', members });
  };

  wss.on('connection', (ws) => {
    const connectionId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    socketMeta.set(ws, {
      connectionId,
      agencyCode: null,
      agentName: 'Agente',
      deviceLabel: 'Dispositivo',
    });

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        sendJson(ws, { type: 'agency:error', message: 'Messaggio non valido.' });
        return;
      }

      const meta = socketMeta.get(ws);
      if (!meta) return;

      if (msg.type === 'ping') {
        sendJson(ws, { type: 'pong' });
        return;
      }

      if (msg.type === 'agency:join') {
        const code = normalizeServerAgencyCode(msg.agencyCode);
        if (!code) {
          sendJson(ws, { type: 'agency:error', message: 'Inserisci un codice agenzia valido.' });
          return;
        }

        detachFromCurrentRoom(ws);

        meta.agencyCode = code;
        meta.agentName = typeof msg.agentName === 'string' && msg.agentName.trim() ? msg.agentName.trim() : 'Agente';
        meta.deviceLabel =
          typeof msg.deviceLabel === 'string' && msg.deviceLabel.trim()
            ? msg.deviceLabel.trim()
            : 'Dispositivo';

        const joined = hub.joinRoom({
          agencyCode: code,
          agencyName: typeof msg.agencyName === 'string' ? msg.agencyName : undefined,
          connectionId: meta.connectionId,
          agentName: meta.agentName,
          deviceLabel: meta.deviceLabel,
          initialClients: Array.isArray(msg.initialClients) ? msg.initialClients : undefined,
        });

        if (!joined) {
          sendJson(ws, { type: 'agency:error', message: 'Impossibile accedere alla stanza agenzia.' });
          return;
        }

        let set = roomSockets.get(code);
        if (!set) {
          set = new Set();
          roomSockets.set(code, set);
        }
        set.add(ws);

        sendJson(ws, {
          type: 'agency:state',
          connectionId: meta.connectionId,
          agencyCode: joined.room.agencyCode,
          agencyName: joined.room.agencyName,
          clients: joined.room.clients,
          members: joined.members,
          recentEvents: joined.room.recentEvents,
        });

        broadcastToRoom(
          code,
          {
            type: 'presence:update',
            members: joined.members,
            event: joined.joinEvent,
          },
          ws,
        );
        return;
      }

      const activeCode = meta.agencyCode;
      if (!activeCode) {
        sendJson(ws, { type: 'agency:error', message: 'Non sei connesso ad alcuna agenzia.' });
        return;
      }

      if (msg.type === 'client:upsert') {
        const res = hub.upsertClient({
          agencyCode: activeCode,
          rawClient: msg.client,
          agentName: meta.agentName,
          deviceLabel: meta.deviceLabel,
        });
        if (!res) return;

        broadcastToRoom(activeCode, {
          type: 'client:upserted',
          client: res.client,
          event: res.event,
          senderConnectionId: meta.connectionId,
        });
        return;
      }

      if (msg.type === 'client:delete') {
        if (typeof msg.clientId !== 'string' && typeof msg.clientId !== 'number') return;
        const res = hub.deleteClient({
          agencyCode: activeCode,
          clientId: String(msg.clientId),
          agentName: meta.agentName,
          deviceLabel: meta.deviceLabel,
        });
        if (!res) return;

        broadcastToRoom(activeCode, {
          type: 'client:deleted',
          clientId: res.clientId,
          event: res.event,
          senderConnectionId: meta.connectionId,
        });
        return;
      }

      if (msg.type === 'clients:replace') {
        if (!Array.isArray(msg.clients)) return;
        const res = hub.replaceClients({
          agencyCode: activeCode,
          rawClients: msg.clients,
          agentName: meta.agentName,
          deviceLabel: meta.deviceLabel,
          reason: typeof msg.reason === 'string' ? msg.reason : undefined,
        });
        if (!res) return;

        broadcastToRoom(activeCode, {
          type: 'agency:state',
          agencyCode: res.room.agencyCode,
          agencyName: res.room.agencyName,
          clients: res.room.clients,
          members: hub.getMembers(activeCode),
          recentEvents: res.room.recentEvents,
          senderConnectionId: meta.connectionId,
        });
      }
    });

    ws.on('close', () => {
      detachFromCurrentRoom(ws);
    });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`ImmoPulse server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
