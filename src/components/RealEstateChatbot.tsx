import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Calculator,
  ExternalLink,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  ChatbotMessage,
  ClientRecord,
  CrmMetrics,
  GroundedSource,
  PlanTier,
  PropertyValuationInput,
} from '../types/crm';
import { PROPERTY_TYPES } from '../utils/crmLogic';
import { useLanguage } from '../contexts/LanguageContext';
import {
  type AppLanguage,
  translatePropertyCondition,
  translatePropertyType,
} from '../utils/i18n';

interface RealEstateChatbotProps {
  clients: ClientRecord[];
  metrics: CrmMetrics;
  activePlan: PlanTier;
  agencyCode?: string | null;
}

const PROPERTY_CONDITIONS = [
  'Nuovo / Classe A',
  'Ristrutturato',
  'Ottimo stato',
  'Buono / Abitabile',
  'Da ristrutturare',
] as const;

function getWelcomeMessage(lang: AppLanguage): ChatbotMessage {
  return {
    id: 'welcome-msg',
    role: 'model',
    timestamp: '',
    text:
      lang === 'en'
        ? 'Hello! I am the ImmoPulse Real Estate Assistant. I answer exclusively about:\n' +
          '• Real estate agency management & acquisition strategies;\n' +
          '• Clients, reminders, and data saved in your ImmoPulse app;\n' +
          '• Real estate valuations aligned with the Italian market.\n\n' +
          'Write below or open the "Value Property" tab to estimate a property right away.'
        : 'Ciao! Sono l’Assistente Immobiliare di ImmoPulse. Rispondo esclusivamente su:\n' +
          '• Gestione e strategie per agenzie immobiliari;\n' +
          '• Clienti, promemoria e dati salvati nella tua app ImmoPulse;\n' +
          '• Valutazioni immobiliari in linea con il mercato italiano.\n\n' +
          'Scrivimi qui sotto oppure apri la scheda "Valutazione" per stimare subito un immobile.',
  };
}

const QUICK_PROMPTS_IT = [
  'Riepilogo dei clienti attivi e richiami urgenti in app',
  'Consigli per acquisire nuovi incarichi di vendita in esclusiva',
  'Valuta un trilocale 90 mq a Milano zona Isola ristrutturato',
];

const QUICK_PROMPTS_EN = [
  'Summary of active clients and urgent follow-ups in the app',
  'Tips to win new exclusive seller mandates',
  'Estimate a renovated 90 sqm 3-room apartment in Milan Isola',
];

export function RealEstateChatbot({
  clients,
  metrics,
  activePlan,
  agencyCode,
}: RealEstateChatbotProps) {
  const { lang, locale } = useLanguage();
  const isEn = lang === 'en';
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'valuation'>('chat');
  const [messages, setMessages] = useState<ChatbotMessage[]>(() => [getWelcomeMessage(lang)]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Structured valuation state
  const [valCity, setValCity] = useState('');
  const [valZone, setValZone] = useState('');
  const [valType, setValType] = useState('Appartamento');
  const [valSqm, setValSqm] = useState('');
  const [valRooms, setValRooms] = useState('');
  const [valFloor, setValFloor] = useState('');
  const [valCondition, setValCondition] = useState('Ristrutturato');
  const [valNotes, setValNotes] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0]?.id === 'welcome-msg') {
        return [getWelcomeMessage(lang)];
      }
      return prev;
    });
  }, [lang]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && mode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, mode]);

  const compactAppContext = useMemo(
    () => ({
      activePlan,
      agencyCode: agencyCode || null,
      metrics,
      clients: clients.slice(0, 60).map((c) => ({
        name: c.name,
        role: c.role,
        status: c.status,
        propertyType: c.propertyType,
        zone: c.zone,
        address: c.address,
        price: c.price,
        sqm: c.sqm,
        rooms: c.rooms,
        reminderDate: c.reminderDate,
        tags: c.tags,
        isFavorite: Boolean(c.isFavorite),
      })),
    }),
    [activePlan, agencyCode, metrics, clients],
  );

  const sendMessageToServer = async (
    userText: string,
    valuationRequest?: PropertyValuationInput,
  ) => {
    const trimmed = userText.trim();
    if (!trimmed && !valuationRequest) return;

    setErrorMsg(null);
    const userMessage: ChatbotMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    };

    const historyBeforeWelcome = messages.filter((m) => m.id !== 'welcome-msg');
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setMode('chat');
    setIsLoading(true);

    try {
      const payloadMessages = valuationRequest
        ? historyBeforeWelcome.map((m) => ({ role: m.role, text: m.text }))
        : [...historyBeforeWelcome, userMessage].map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          appContext: compactAppContext,
          valuationRequest,
          lang,
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        sources?: GroundedSource[];
        error?: string;
      };

      if (!res.ok) {
        setErrorMsg(
          data?.error ||
            (isEn
              ? 'Unable to get a response from the AI assistant.'
              : 'Impossibile ottenere risposta dall’assistente AI.'),
        );
      } else {
        const replyMsg: ChatbotMessage = {
          id: `m-${Date.now()}`,
          role: 'model',
          text: data.reply || (isEn ? 'Response received.' : 'Risposta ricevuta.'),
          sources: Array.isArray(data.sources) ? data.sources : [],
          timestamp: new Date().toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setMessages((prev) => [...prev, replyMsg]);
      }
    } catch {
      setErrorMsg(
        isEn
          ? 'Network error while communicating with the AI assistant.'
          : 'Errore di rete durante la comunicazione con l’assistente AI.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    void sendMessageToServer(text);
  };

  const handleValuationSubmit = (e: FormEvent) => {
    e.preventDefault();
    const sqmNumber = Number(valSqm);
    if (!valCity.trim() || !Number.isFinite(sqmNumber) || sqmNumber <= 0) {
      setErrorMsg(
        isEn
          ? 'Please enter at least the city and the area in sqm to calculate the valuation.'
          : 'Inserisci almeno la città e la superficie in mq per calcolare la valutazione.',
      );
      return;
    }

    const label = isEn
      ? `Property valuation: ${translatePropertyType(valType, lang)}, ${sqmNumber} sqm in ${valCity.trim()}${
          valZone.trim() ? ` (${valZone.trim()})` : ''
        }, condition ${translatePropertyCondition(valCondition, lang)}.`
      : `Valutazione immobile: ${valType}, ${sqmNumber} mq a ${valCity.trim()}${
          valZone.trim() ? ` (${valZone.trim()})` : ''
        }, stato ${valCondition}.`;

    void sendMessageToServer(label, {
      city: valCity.trim(),
      zone: valZone.trim(),
      propertyType: valType,
      sqm: sqmNumber,
      rooms: valRooms.trim(),
      floor: valFloor.trim(),
      condition: valCondition,
      notes: valNotes.trim(),
    });
  };

  const quickPrompts = isEn ? QUICK_PROMPTS_EN : QUICK_PROMPTS_IT;

  return (
    <>
      {/* Floating Circular AI Launcher Button (Icon-only) */}
      {!isOpen && (
        <button
          type="button"
          data-testid="chatbot-launcher"
          onClick={() => setIsOpen(true)}
          title={isEn ? 'AI Assistant & Valuations' : 'Assistente & Valutazioni AI'}
          aria-label={
            isEn
              ? 'Open AI real estate assistant and valuations'
              : 'Apri assistente e valutazioni immobiliari AI'
          }
          className="fixed bottom-[82px] right-4 md:bottom-6 md:right-6 z-40 w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-br from-[#0e4d5f] to-[#177858] hover:from-[#0a3c4a] hover:to-[#125f46] text-white shadow-xl shadow-[#0e4d5f]/25 border-2 border-[#cbe2de]/80 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 animate-ai-fab"
        >
          <Bot className="w-6 h-6 text-[#9ef2d4]" aria-hidden="true" />
        </button>
      )}

      {/* Drawer / Bottom-Sheet Modal */}
      {isOpen && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-[#092b35]/35 backdrop-blur-[2px] animate-backdrop"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              isEn
                ? 'ImmoPulse Real Estate Assistant and Valuations'
                : 'Assistente e Valutazioni Immobiliari ImmoPulse'
            }
            data-testid="chatbot-panel"
            className="fixed bottom-20 right-3 left-3 sm:left-auto sm:right-6 md:bottom-6 z-50 sm:w-[440px] max-h-[78vh] bg-white border border-[#cbe2de] rounded-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-bottom-sheet"
          >
          {/* Panel Header */}
          <div className="px-4 py-3 bg-[#0e4d5f] text-white flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <div className="font-display font-bold text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#2eb086] shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {isEn ? 'ImmoPulse AI Assistant' : 'Assistente ImmoPulse AI'}
                </span>
              </div>
              <p className="text-[11px] text-[#cfe8e3] truncate">
                {isEn
                  ? 'Real Estate Agencies · App Data · Market Valuations'
                  : 'Agenzie Immobiliari · Dati App · Valutazioni di Mercato'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={isEn ? 'Close assistant chat' : 'Chiudi chat assistente'}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 border-b border-[#e1f0ed] bg-[#f4faf9] p-1 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setMode('chat');
              }}
              className={`py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                mode === 'chat'
                  ? 'bg-white text-[#0e4d5f] shadow-2xs border border-[#cbe2de]'
                  : 'text-[#5a808a] hover:text-[#0e4d5f]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isEn ? 'Real Estate Chat' : 'Chat Immobiliare'}</span>
            </button>
            <button
              type="button"
              data-testid="chatbot-tab-valuation"
              onClick={() => {
                setErrorMsg(null);
                setMode('valuation');
              }}
              className={`py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                mode === 'valuation'
                  ? 'bg-white text-[#0e4d5f] shadow-2xs border border-[#cbe2de]'
                  : 'text-[#5a808a] hover:text-[#0e4d5f]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-[#2eb086]" aria-hidden="true" />
              <span>{isEn ? 'Value Property' : 'Valuta Immobile'}</span>
            </button>
          </div>

          {/* Chat Content vs Valuation Form */}
          {mode === 'chat' ? (
            <>
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#f9fcfc]">
                {/* Quick Prompts */}
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={isLoading}
                      onClick={() => void sendMessageToServer(q)}
                      className="text-left px-2.5 py-1 rounded-lg bg-white hover:bg-[#e6f7f1] text-[#0e4d5f] border border-[#cbe2de] text-[11px] font-medium transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-[#0e4d5f] text-white'
                          : 'bg-white border border-[#cbe2de] text-[#0f3b47]'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1 max-w-[90%]">
                        {msg.sources.slice(0, 4).map((src, i) => (
                          <a
                            key={`${src.uri}-${i}`}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#eef6f5] hover:bg-[#dceceb] border border-[#cbe2de] text-[11px] text-[#0e4d5f] font-medium"
                          >
                            <span className="truncate max-w-[150px]">{src.domain || src.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-[#0e4d5f] bg-white border border-[#cbe2de] rounded-xl px-3.5 py-2.5 w-fit">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2eb086]" aria-hidden="true" />
                    <span>
                      {isEn
                        ? 'Processing reply and market data...'
                        : 'Elaborazione risposta e dati di mercato...'}
                    </span>
                  </div>
                )}

                {errorMsg && (
                  <div
                    role="alert"
                    className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs"
                  >
                    {errorMsg}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleChatSubmit}
                className="p-3 border-t border-[#e1f0ed] bg-white flex items-center gap-2 shrink-0"
              >
                <label htmlFor="chatbot-input" className="sr-only">
                  {isEn
                    ? 'Ask a question about real estate agencies, ImmoPulse clients, or property valuations'
                    : 'Scrivi una domanda su agenzie immobiliari, clienti ImmoPulse o valutazioni'}
                </label>
                <input
                  id="chatbot-input"
                  data-testid="chatbot-input"
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Ask about clients, agency, or valuations...'
                      : 'Chiedi su clienti, agenzia o valutazioni...'
                  }
                  className="flex-1 bg-[#f4faf9] border border-[#cbe2de] rounded-xl px-3 py-2 text-xs text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
                <button
                  type="submit"
                  data-testid="chatbot-send"
                  disabled={isLoading || !inputText.trim()}
                  aria-label={isEn ? 'Send message to assistant' : "Invia messaggio all'assistente"}
                  className="p-2.5 rounded-xl bg-[#0e4d5f] hover:bg-[#0a3c4a] disabled:opacity-50 text-white transition-colors"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </>
          ) : (
            <form
              data-testid="valuation-form"
              onSubmit={handleValuationSubmit}
              className="flex-1 overflow-y-auto p-4 space-y-3 text-xs"
            >
              <p className="text-[#3b5e68] leading-relaxed">
                {isEn ? (
                  <>
                    Calculate an{' '}
                    <strong className="text-[#0e4d5f]">up-to-date property valuation</strong>{' '}
                    aligned with real market values (min/avg/max per sqm and rental estimate).
                  </>
                ) : (
                  <>
                    Calcola in qualsiasi momento una{' '}
                    <strong className="text-[#0e4d5f]">valutazione immobiliare aggiornata</strong>{' '}
                    in linea con i valori reali di mercato (min/medio/max al mq e stima locativa).
                  </>
                )}
              </p>

              {errorMsg && (
                <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="val-city" className="block text-[#3b5e68] mb-1">
                    {isEn ? 'City / Municipality *' : 'Città / Comune *'}
                  </label>
                  <input
                    id="val-city"
                    type="text"
                    required
                    value={valCity}
                    onChange={(e) => setValCity(e.target.value)}
                    placeholder={isEn ? 'e.g. Milan' : 'Es. Milano'}
                    className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-2.5 py-2 text-[#0f3b47]"
                  />
                </div>
                <div>
                  <label htmlFor="val-zone" className="block text-[#3b5e68] mb-1">
                    {isEn ? 'Area / Neighborhood' : 'Zona / Quartiere'}
                  </label>
                  <input
                    id="val-zone"
                    type="text"
                    value={valZone}
                    onChange={(e) => setValZone(e.target.value)}
                    placeholder={isEn ? 'e.g. Isola / Center' : 'Es. Isola / Centro'}
                    className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-2.5 py-2 text-[#0f3b47]"
                  />
                </div>
                <div>
                  <label htmlFor="val-type" className="block text-[#3b5e68] mb-1">
                    {isEn ? 'Property Type' : 'Tipologia'}
                  </label>
                  <select
                    id="val-type"
                    value={valType}
                    onChange={(e) => setValType(e.target.value)}
                    className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-2.5 py-2 text-[#0f3b47]"
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {translatePropertyType(t, lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="val-sqm" className="block text-[#3b5e68] mb-1">
                    {isEn ? 'Area (sqm) *' : 'Superficie (m²) *'}
                  </label>
                  <input
                    id="val-sqm"
                    type="number"
                    min={10}
                    required
                    value={valSqm}
                    onChange={(e) => setValSqm(e.target.value)}
                    placeholder="90"
                    className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-2.5 py-2 text-[#0f3b47] tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="val-rooms" className="block text-[#3b5e68] mb-1">
                    {isEn ? 'Rooms' : 'Locali'}
                  </label>
                  <input
                    id="val-rooms"
                    type="text"
                    value={valRooms}
                    onChange={(e) => setValRooms(e.target.value)}
                    placeholder={isEn ? '3 rooms' : '3 locali'}
                    className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-2.5 py-2 text-[#0f3b47]"
                  />
                </div>
                <div>
                  <label htmlFor="val-condition" className="block text-[#3b5e68] mb-1">
                    {isEn ? 'Property Condition' : 'Stato immobile'}
                  </label>
                  <select
                    id="val-condition"
                    value={valCondition}
                    onChange={(e) => setValCondition(e.target.value)}
                    className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-2.5 py-2 text-[#0f3b47]"
                  >
                    {PROPERTY_CONDITIONS.map((cond) => (
                      <option key={cond} value={cond}>
                        {translatePropertyCondition(cond, lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="val-floor" className="block text-[#3b5e68] mb-1">
                    {isEn ? 'Floor' : 'Piano'}
                  </label>
                  <input
                    id="val-floor"
                    type="text"
                    value={valFloor}
                    onChange={(e) => setValFloor(e.target.value)}
                    placeholder={isEn ? 'e.g. 3rd with elevator' : 'Es. 3° con ascensore'}
                    className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-2.5 py-2 text-[#0f3b47]"
                  />
                </div>
                <div>
                  <label htmlFor="val-notes" className="block text-[#3b5e68] mb-1">
                    {isEn ? 'Features / Notes' : 'Pertinenze / Note'}
                  </label>
                  <input
                    id="val-notes"
                    type="text"
                    value={valNotes}
                    onChange={(e) => setValNotes(e.target.value)}
                    placeholder={isEn ? 'Garage, terrace...' : 'Box auto, terrazzo...'}
                    className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-2.5 py-2 text-[#0f3b47]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-[#177858] hover:bg-[#125f46] text-white font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Calculator className="w-4 h-4" aria-hidden="true" />
                <span>
                  {isEn ? 'Calculate Market Valuation' : 'Calcola Valutazione di Mercato'}
                </span>
              </button>
            </form>
          )}
        </div>
        </>
      )}
    </>
  );
}
