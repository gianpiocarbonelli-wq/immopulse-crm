import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AgencyActivityEvent,
  AgencyConnectionStatus,
  AgencyMember,
  AgencyWorkspaceConfig,
  ClientRecord,
} from '../types/crm';
import { normalizeAgencyCode } from '../utils/crmLogic';

interface UseAgencySyncParams {
  enabled: boolean;
  workspace: AgencyWorkspaceConfig | null;
  clientsRef: { current: ClientRecord[] };
  onRemoteState: (payload: {
    agencyCode: string;
    agencyName: string;
    clients: ClientRecord[];
    recentEvents: AgencyActivityEvent[];
    isInitialJoin: boolean;
  }) => void;
  onRemoteUpsert: (client: ClientRecord, event?: AgencyActivityEvent) => void;
  onRemoteDelete: (clientId: string, event?: AgencyActivityEvent) => void;
  onSyncError?: (message: string) => void;
}

type OutboundSyncMessage =
  | { type: 'client:upsert'; client: ClientRecord }
  | { type: 'client:delete'; clientId: string }
  | { type: 'clients:replace'; clients: ClientRecord[]; reason?: string };

export function useAgencySync({
  enabled,
  workspace,
  clientsRef,
  onRemoteState,
  onRemoteUpsert,
  onRemoteDelete,
  onSyncError,
}: UseAgencySyncParams) {
  const [status, setStatus] = useState<AgencyConnectionStatus>('disconnected');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [activeAgencyCode, setActiveAgencyCode] = useState<string>('');
  const [activeAgencyName, setActiveAgencyName] = useState<string>('');
  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [recentEvents, setRecentEvents] = useState<AgencyActivityEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const myConnectionIdRef = useRef<string | null>(null);
  const joinedRoomRef = useRef(false);
  const pendingQueueRef = useRef<OutboundSyncMessage[]>([]);
  const reconnectTimerRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);

  const callbacksRef = useRef({
    onRemoteState,
    onRemoteUpsert,
    onRemoteDelete,
    onSyncError,
  });
  callbacksRef.current = {
    onRemoteState,
    onRemoteUpsert,
    onRemoteDelete,
    onSyncError,
  };

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current !== null) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const flushPendingQueue = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !joinedRoomRef.current) return;
    if (pendingQueueRef.current.length === 0) return;

    const items = pendingQueueRef.current.splice(0, pendingQueueRef.current.length);
    for (const item of items) {
      ws.send(JSON.stringify(item));
    }
  }, []);

  const sendOrQueue = useCallback((msg: OutboundSyncMessage) => {
    if (!enabled || !workspace) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && joinedRoomRef.current) {
      ws.send(JSON.stringify(msg));
      return;
    }
    pendingQueueRef.current = [...pendingQueueRef.current.slice(-49), msg];
  }, [enabled, workspace]);

  const sendUpsert = useCallback(
    (client: ClientRecord) => {
      sendOrQueue({ type: 'client:upsert', client });
    },
    [sendOrQueue],
  );

  const sendDelete = useCallback(
    (clientId: string) => {
      sendOrQueue({ type: 'client:delete', clientId: String(clientId) });
    },
    [sendOrQueue],
  );

  const sendReplace = useCallback(
    (clients: ClientRecord[], reason?: string) => {
      sendOrQueue({ type: 'clients:replace', clients, reason });
    },
    [sendOrQueue],
  );

  const normalizedCode = workspace ? normalizeAgencyCode(workspace.agencyCode) : '';
  const agencyName = workspace?.agencyName || '';
  const agentName = workspace?.agentName || '';
  const deviceLabel = workspace?.deviceLabel || '';

  useEffect(() => {
    clearTimers();

    if (!enabled || !normalizedCode) {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // Ignore close cleanup issues
        }
        wsRef.current = null;
      }
      myConnectionIdRef.current = null;
      joinedRoomRef.current = false;
      pendingQueueRef.current = [];
      setStatus('disconnected');
      setConnectionId(null);
      setActiveAgencyCode('');
      setActiveAgencyName('');
      setMembers([]);
      setRecentEvents([]);
      return;
    }

    let disposed = false;
    let reconnectAttempt = 0;

    const connect = () => {
      if (disposed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/agency`;
      setStatus('connecting');
      joinedRoomRef.current = false;

      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        setStatus('error');
        return;
      }
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        if (disposed) return;
        reconnectAttempt = 0;
        ws.send(
          JSON.stringify({
            type: 'agency:join',
            agencyCode: normalizedCode,
            agencyName: agencyName || undefined,
            agentName: agentName || 'Agente',
            deviceLabel: deviceLabel || 'Dispositivo',
            initialClients: clientsRef.current,
          }),
        );

        heartbeatTimerRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      });

      ws.addEventListener('message', (evt) => {
        if (disposed) return;
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(evt.data)) as Record<string, unknown>;
        } catch {
          return;
        }

        if (msg.type === 'pong') return;

        if (msg.type === 'agency:error') {
          const message =
            typeof msg.message === 'string' ? msg.message : 'Errore sincronizzazione agenzia.';
          setStatus('error');
          callbacksRef.current.onSyncError?.(message);
          return;
        }

        if (msg.type === 'agency:state') {
          const senderConn = typeof msg.senderConnectionId === 'string' ? msg.senderConnectionId : null;
          const isInitialJoin = !senderConn && typeof msg.connectionId === 'string';

          if (isInitialJoin && typeof msg.connectionId === 'string') {
            myConnectionIdRef.current = msg.connectionId;
            setConnectionId(msg.connectionId);
            joinedRoomRef.current = true;
            setStatus('connected');
          }

          if (typeof msg.agencyCode === 'string') setActiveAgencyCode(msg.agencyCode);
          if (typeof msg.agencyName === 'string') setActiveAgencyName(msg.agencyName);
          if (Array.isArray(msg.members)) setMembers(msg.members as AgencyMember[]);
          if (Array.isArray(msg.recentEvents)) {
            setRecentEvents(msg.recentEvents as AgencyActivityEvent[]);
          }

          const isFromSelf = Boolean(senderConn && senderConn === myConnectionIdRef.current);
          if (!isFromSelf && Array.isArray(msg.clients)) {
            callbacksRef.current.onRemoteState({
              agencyCode: typeof msg.agencyCode === 'string' ? msg.agencyCode : normalizedCode,
              agencyName: typeof msg.agencyName === 'string' ? msg.agencyName : agencyName,
              clients: msg.clients as ClientRecord[],
              recentEvents: Array.isArray(msg.recentEvents)
                ? (msg.recentEvents as AgencyActivityEvent[])
                : [],
              isInitialJoin,
            });
          }

          if (isInitialJoin) {
            flushPendingQueue();
          }
          return;
        }

        if (msg.type === 'presence:update') {
          if (Array.isArray(msg.members)) {
            setMembers(msg.members as AgencyMember[]);
          }
          if (msg.event && typeof msg.event === 'object') {
            const eventObj = msg.event as AgencyActivityEvent;
            setRecentEvents((prev) => [eventObj, ...prev.filter((e) => e.id !== eventObj.id)].slice(0, 20));
          }
          return;
        }

        if (msg.type === 'client:upserted') {
          const eventObj =
            msg.event && typeof msg.event === 'object' ? (msg.event as AgencyActivityEvent) : undefined;
          if (eventObj) {
            setRecentEvents((prev) => [eventObj, ...prev.filter((e) => e.id !== eventObj.id)].slice(0, 20));
          }
          const senderConn = typeof msg.senderConnectionId === 'string' ? msg.senderConnectionId : null;
          if (senderConn && senderConn === myConnectionIdRef.current) return;
          if (msg.client && typeof msg.client === 'object') {
            callbacksRef.current.onRemoteUpsert(msg.client as ClientRecord, eventObj);
          }
          return;
        }

        if (msg.type === 'client:deleted') {
          const eventObj =
            msg.event && typeof msg.event === 'object' ? (msg.event as AgencyActivityEvent) : undefined;
          if (eventObj) {
            setRecentEvents((prev) => [eventObj, ...prev.filter((e) => e.id !== eventObj.id)].slice(0, 20));
          }
          const senderConn = typeof msg.senderConnectionId === 'string' ? msg.senderConnectionId : null;
          if (senderConn && senderConn === myConnectionIdRef.current) return;
          if (typeof msg.clientId === 'string' || typeof msg.clientId === 'number') {
            callbacksRef.current.onRemoteDelete(String(msg.clientId), eventObj);
          }
        }
      });

      ws.addEventListener('error', () => {
        if (disposed) return;
        setStatus('error');
      });

      ws.addEventListener('close', () => {
        if (heartbeatTimerRef.current !== null) {
          window.clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        joinedRoomRef.current = false;
        if (disposed) return;

        setStatus('connecting');
        const delayMs = Math.min(8000, 1000 * Math.pow(2, reconnectAttempt));
        reconnectAttempt += 1;
        reconnectTimerRef.current = window.setTimeout(connect, delayMs);
      });
    };

    connect();

    return () => {
      disposed = true;
      clearTimers();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // Ignore close cleanup issues
        }
        wsRef.current = null;
      }
      joinedRoomRef.current = false;
    };
  }, [enabled, normalizedCode, agencyName, agentName, deviceLabel, clientsRef, clearTimers, flushPendingQueue]);

  return {
    status,
    isConnected: enabled && status === 'connected',
    connectionId,
    activeAgencyCode,
    activeAgencyName,
    members,
    recentEvents,
    sendUpsert,
    sendDelete,
    sendReplace,
  };
}
