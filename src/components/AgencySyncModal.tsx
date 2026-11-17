import { type FormEvent, useEffect, useState } from 'react';
import {
  Building2,
  Check,
  Copy,
  Crown,
  Laptop,
  RefreshCw,
  Unplug,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type {
  AgencyActivityEvent,
  AgencyConnectionStatus,
  AgencyMember,
  AgencyWorkspaceConfig,
  PlanTier,
} from '../types/crm';
import { detectDeviceLabel, generateAgencyCode, normalizeAgencyCode } from '../utils/crmLogic';

interface AgencySyncModalProps {
  isOpen: boolean;
  activePlan: PlanTier;
  defaultAgentName: string;
  workspace: AgencyWorkspaceConfig | null;
  status: AgencyConnectionStatus;
  connectionId: string | null;
  activeAgencyCode: string;
  activeAgencyName: string;
  members: AgencyMember[];
  recentEvents: AgencyActivityEvent[];
  onClose: () => void;
  onConnectWorkspace: (config: AgencyWorkspaceConfig) => void;
  onDisconnectWorkspace: () => void;
  onOpenAgencyPlanUpgrade: () => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function AgencySyncModal({
  isOpen,
  activePlan,
  defaultAgentName,
  workspace,
  status,
  connectionId,
  activeAgencyCode,
  activeAgencyName,
  members,
  recentEvents,
  onClose,
  onConnectWorkspace,
  onDisconnectWorkspace,
  onOpenAgencyPlanUpgrade,
  onNotify,
}: AgencySyncModalProps) {
  const { lang, locale } = useLanguage();
  const [agencyNameInput, setAgencyNameInput] = useState('');
  const [agencyCodeInput, setAgencyCodeInput] = useState('');
  const [agentNameInput, setAgentNameInput] = useState('');
  const [deviceLabelInput, setDeviceLabelInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCopiedCode(false);
    setAgencyNameInput(activeAgencyName || workspace?.agencyName || '');
    setAgencyCodeInput(activeAgencyCode || workspace?.agencyCode || '');
    setAgentNameInput(workspace?.agentName || defaultAgentName || '');
    setDeviceLabelInput(workspace?.deviceLabel || detectDeviceLabel());
  }, [isOpen, workspace, activeAgencyName, activeAgencyCode, defaultAgentName]);

  if (!isOpen) return null;

  const isAgencyPlan = activePlan === 'agency';
  const normalizedInputCode = normalizeAgencyCode(agencyCodeInput);

  const handleGenerateCode = () => {
    const code = generateAgencyCode(
      agencyNameInput || agentNameInput || (lang === 'en' ? 'AGENCY' : 'AGENZIA'),
    );
    setAgencyCodeInput(code);
  };

  const handleCopyCode = async () => {
    const codeToCopy = activeAgencyCode || normalizedInputCode;
    if (!codeToCopy) return;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopiedCode(true);
      onNotify(
        lang === 'en'
          ? `Agency code "${codeToCopy}" copied to clipboard.`
          : `Codice agenzia "${codeToCopy}" copiato negli appunti.`,
      );
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      onNotify(
        lang === 'en'
          ? 'Manual copy: select the displayed agency code.'
          : 'Copia manuale: seleziona il codice agenzia mostrato.',
        'info',
      );
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = normalizeAgencyCode(agencyCodeInput);
    if (!cleanCode) {
      onNotify(
        lang === 'en'
          ? 'Enter or generate a valid Agency Code (e.g. ROSSI-2026).'
          : 'Inserisci o genera un Codice Agenzia valido (es. ROSSI-2026).',
        'error',
      );
      return;
    }
    const config: AgencyWorkspaceConfig = {
      agencyCode: cleanCode,
      agencyName: agencyNameInput.trim(),
      agentName:
        agentNameInput.trim() || defaultAgentName || (lang === 'en' ? 'Agent' : 'Agente'),
      deviceLabel: deviceLabelInput.trim() || detectDeviceLabel(),
    };
    onConnectWorkspace(config);
  };

  const statusBadge =
    status === 'connected' ? (
      <span
        data-testid="agency-status-badge"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#e6f7f1] text-[#177858] border border-[#2eb086]/40 text-xs font-semibold"
      >
        <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
        {lang === 'en' ? `Connected live (${members.length})` : `Connesso live (${members.length})`}
      </span>
    ) : status === 'connecting' ? (
      <span
        data-testid="agency-status-badge"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        {lang === 'en' ? 'Connecting...' : 'Connessione in corso...'}
      </span>
    ) : (
      <span
        data-testid="agency-status-badge"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold"
      >
        <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
        {lang === 'en' ? 'Not connected' : 'Non collegato'}
      </span>
    );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agency-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-[#092b35]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-backdrop"
    >
      <div className="bg-white border border-[#cbe2de] w-full max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl sm:my-auto flex flex-col max-h-[92vh] animate-bottom-sheet">
        <div className="px-6 py-4 border-b border-[#e1f0ed] flex items-center justify-between bg-[#f4faf9] sticky top-0 z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2
              id="agency-modal-title"
              className="font-bold text-base text-[#0e4d5f] flex items-center gap-2"
            >
              <Building2 className="w-5 h-5 text-[#0e4d5f]" aria-hidden="true" />
              {lang === 'en'
                ? 'Multi-Device Agency Team'
                : 'Team Agenzia Multi-Dispositivo'}
            </h2>
            {isAgencyPlan && statusBadge}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'en' ? 'Close agency team modal' : 'Chiudi finestra team agenzia'}
            className="p-1.5 rounded-lg text-[#5a808a] hover:text-[#0e4d5f]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {!isAgencyPlan ? (
            <div className="space-y-4 bg-[#f4faf9] border border-[#cbe2de] rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Crown className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1.5">
                  <h3 className="font-bold text-[#0e4d5f] text-base">
                    {lang === 'en'
                      ? 'Connect your whole agency in real time — 149,00 € / year'
                      : "Collega tutta l'agenzia in tempo reale — € 149,00 / anno"}
                  </h3>
                  <p className="text-xs text-[#3b5e68] leading-relaxed">
                    {lang === 'en' ? (
                      <>
                        With the <strong>Agency / Multi-Device Team Plan (149,00 € / year)</strong> all
                        devices (office PCs, agent smartphones and tablets) sync instantly using the
                        same <strong>Agency Code</strong>: new clients, edits, favorites, and reminders
                        update live without refreshing the page.
                      </>
                    ) : (
                      <>
                        Con il <strong>Piano Agenzia / Team Multi-Dispositivo (€ 149,00 / anno)</strong> tutti i
                        dispositivi (PC in ufficio, smartphone e tablet degli agenti) si sincronizzano
                        all&apos;istante tramite lo stesso <strong>Codice Agenzia</strong>: nuovi clienti,
                        modifiche, preferiti e richiami si aggiornano live senza ricaricare la pagina.
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-white border border-[#cbe2de] text-[#3b5e68] text-xs font-semibold"
                >
                  {lang === 'en' ? 'Close' : 'Chiudi'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAgencyPlanUpgrade();
                  }}
                  className="px-4 py-2 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold"
                >
                  {lang === 'en'
                    ? 'Activate Agency Plan (149,00 €/year)'
                    : 'Attiva Piano Agenzia (€ 149/anno)'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <form
                onSubmit={handleSubmit}
                className="space-y-4 bg-[#f9fcfc] border border-[#cbe2de] rounded-xl p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-[#0e4d5f]">
                      {lang === 'en'
                        ? 'Agency Room Setup (149,00 € / year active)'
                        : 'Configurazione Stanza Agenzia (€ 149,00 / anno attivo)'}
                    </div>
                    <p className="text-xs text-[#4a707a]">
                      {lang === 'en'
                        ? 'Enter the same Agency Code on every device to sync client cards, favorites, and schedule in real time.'
                        : 'Inserisci lo stesso Codice Agenzia su tutti i dispositivi per sincronizzare schede clienti, preferiti e agenda in tempo reale.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="agency-name-input" className="block text-xs text-[#3b5e68] mb-1">
                      {lang === 'en' ? 'Agency Name' : 'Nome Agenzia'}
                    </label>
                    <input
                      id="agency-name-input"
                      data-testid="agency-name-input"
                      type="text"
                      value={agencyNameInput}
                      onChange={(e) => setAgencyNameInput(e.target.value)}
                      placeholder={
                        lang === 'en'
                          ? 'e.g. Rossi Real Estate Milan'
                          : 'Es. Immobiliare Rossi Milano'
                      }
                      className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                    />
                  </div>

                  <div>
                    <label htmlFor="agency-code-input" className="block text-xs text-[#3b5e68] mb-1">
                      {lang === 'en' ? 'Shared Agency Code *' : 'Codice Agenzia Condiviso *'}
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        id="agency-code-input"
                        data-testid="agency-code-input"
                        type="text"
                        required
                        value={agencyCodeInput}
                        onChange={(e) => setAgencyCodeInput(e.target.value.toUpperCase())}
                        placeholder={lang === 'en' ? 'e.g. ROSSI-2026' : 'Es. ROSSI-2026'}
                        className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] font-mono uppercase tracking-wider focus:outline-none focus:border-[#2eb086]"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateCode}
                        title={
                          lang === 'en' ? 'Generate new agency code' : 'Genera nuovo codice agenzia'
                        }
                        className="px-2.5 py-2 rounded-lg bg-[#eef6f5] hover:bg-[#dceceb] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold whitespace-nowrap shrink-0"
                      >
                        {lang === 'en' ? 'Generate' : 'Genera'}
                      </button>
                      {(activeAgencyCode || normalizedInputCode) && (
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          aria-label={lang === 'en' ? 'Copy agency code' : 'Copia codice agenzia'}
                          title={lang === 'en' ? 'Copy agency code' : 'Copia codice agenzia'}
                          className="px-2.5 py-2 rounded-lg bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold shrink-0 inline-flex items-center"
                        >
                          {copiedCode ? (
                            <Check className="w-4 h-4 text-[#177858]" aria-hidden="true" />
                          ) : (
                            <Copy className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="agency-agent-input" className="block text-xs text-[#3b5e68] mb-1">
                      {lang === 'en' ? 'Agent Name *' : 'Nome Agente *'}
                    </label>
                    <input
                      id="agency-agent-input"
                      data-testid="agency-agent-input"
                      type="text"
                      required
                      value={agentNameInput}
                      onChange={(e) => setAgentNameInput(e.target.value)}
                      placeholder={lang === 'en' ? 'e.g. Marco Rossi' : 'Es. Marco Rossi'}
                      className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                    />
                  </div>

                  <div>
                    <label htmlFor="agency-device-input" className="block text-xs text-[#3b5e68] mb-1">
                      {lang === 'en' ? 'Device Label' : 'Etichetta Dispositivo'}
                    </label>
                    <input
                      id="agency-device-input"
                      data-testid="agency-device-input"
                      type="text"
                      value={deviceLabelInput}
                      onChange={(e) => setDeviceLabelInput(e.target.value)}
                      placeholder={
                        lang === 'en'
                          ? 'e.g. Marco iPhone / Office PC'
                          : 'Es. iPhone Marco / PC Ufficio'
                      }
                      className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {workspace ? (
                    <button
                      type="button"
                      data-testid="agency-disconnect-btn"
                      onClick={onDisconnectWorkspace}
                      className="px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Unplug className="w-3.5 h-3.5" aria-hidden="true" />
                      {lang === 'en' ? 'Disconnect device' : 'Disconnetti dispositivo'}
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#5a808a]">
                      {lang === 'en'
                        ? 'Current records will be merged if the room is new.'
                        : 'I dati correnti verranno uniti alla stanza se la stanza è nuova.'}
                    </span>
                  )}
                  <button
                    type="submit"
                    data-testid="agency-connect-submit"
                    className="px-4 py-2 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
                    {workspace
                      ? lang === 'en'
                        ? 'Update & Reconnect'
                        : 'Aggiorna e Ricollega'
                      : lang === 'en'
                        ? 'Connect Device in Real Time'
                        : 'Collega Dispositivo in Tempo Reale'}
                  </button>
                </div>
              </form>

              {/* Connected Devices & Agents List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#0e4d5f] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#177858]" aria-hidden="true" />
                    {lang === 'en'
                      ? `Agents & Devices Online (${members.length})`
                      : `Agenti e Dispositivi Online (${members.length})`}
                  </h3>
                  {activeAgencyCode && (
                    <span className="text-xs font-mono font-bold text-[#0e4d5f] bg-[#eef6f5] px-2 py-0.5 rounded border border-[#cbe2de]">
                      {activeAgencyCode}
                    </span>
                  )}
                </div>

                {members.length === 0 ? (
                  <p className="text-xs text-[#5a808a] bg-[#f9fcfc] border border-dashed border-[#cbe2de] rounded-xl p-4">
                    {lang === 'en'
                      ? 'No devices connected. Enter an Agency Code above and click "Connect Device in Real Time".'
                      : 'Nessun dispositivo connesso. Inserisci un Codice Agenzia qui sopra e premi "Collega Dispositivo in Tempo Reale".'}
                  </p>
                ) : (
                  <div
                    data-testid="agency-members-list"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                  >
                    {members.map((m) => {
                      const isSelf = connectionId !== null && m.connectionId === connectionId;
                      return (
                        <div
                          key={m.connectionId}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                            isSelf
                              ? 'bg-[#eefaf6] border-[#2eb086]/60'
                              : 'bg-white border-[#cbe2de]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-[#0e4d5f]/10 text-[#0e4d5f] shrink-0">
                              <Laptop className="w-4 h-4" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#0e4d5f] truncate">
                                {m.agentName}
                                {isSelf && (
                                  <span className="ml-1.5 text-[10px] font-semibold text-[#177858]">
                                    {lang === 'en' ? '(This device)' : '(Questo dispositivo)'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#4a707a] truncate">
                                {m.deviceLabel}
                              </div>
                            </div>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-[#2eb086] shrink-0" title="Online" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Real-Time Events */}
              {recentEvents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-[#0e4d5f] uppercase tracking-wider">
                    {lang === 'en' ? 'Live Team Activity' : 'Attività Team in Tempo Reale'}
                  </h3>
                  <div
                    data-testid="agency-events-list"
                    className="max-h-44 overflow-y-auto divide-y divide-[#e8f2f0] border border-[#cbe2de] rounded-xl bg-white"
                  >
                    {recentEvents.map((evt) => {
                      const timeStr = new Date(evt.timestamp).toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <div
                          key={evt.id}
                          className="px-3 py-2 text-xs flex items-baseline justify-between gap-2"
                        >
                          <div className="text-[#25454e]">
                            <span className="font-semibold text-[#0e4d5f]">{evt.agentName}</span>{' '}
                            <span className="text-[#5a808a]">({evt.deviceLabel})</span>:{' '}
                            <span>{evt.action}</span>
                          </div>
                          <span className="text-[11px] font-mono text-[#5a808a] shrink-0 tabular-nums">
                            {timeStr}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
