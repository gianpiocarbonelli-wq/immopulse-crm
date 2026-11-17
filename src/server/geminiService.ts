import { GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from '@google/genai';
import type {
  CrmMetrics,
  GroundedSource,
  PortalSearchFilters,
  PortalSearchResponse,
  PortalSearchResultItem,
  PropertyPortalConfig,
  PropertyValuationInput,
} from '../types/crm.ts';
import {
  buildSearchQueryWithFilters,
  extractPortalHostname,
  normalizePortalUrl,
} from '../utils/portalSearch.ts';

export interface ChatbotClientSummary {
  name: string;
  role: string;
  status: string;
  propertyType: string;
  zone: string;
  address?: string;
  price: number;
  sqm?: number;
  rooms?: string;
  reminderDate?: string;
  tags?: string[];
  isFavorite?: boolean;
}

export interface ChatbotAppContext {
  activePlan?: string;
  agencyCode?: string | null;
  metrics?: Partial<CrmMetrics>;
  clients?: ChatbotClientSummary[];
}

export interface ChatTurnInput {
  role: 'user' | 'model';
  text: string;
}

let cachedAiClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      'Servizio assistente AI non disponibile: nessuna chiave Gemini configurata sul server.',
    );
  }
  if (!cachedAiClient || cachedApiKey !== apiKey) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedApiKey = apiKey;
  }
  return cachedAiClient;
}

export function buildAppContextSummary(
  appContext?: ChatbotAppContext,
  lang: 'it' | 'en' = 'it',
): string {
  if (!appContext) {
    return lang === 'en'
      ? 'No client archive data loaded yet.'
      : 'Nessun dato archivio clienti caricato al momento.';
  }

  const lines: string[] = [];
  if (appContext.activePlan) {
    lines.push(
      lang === 'en' ? `Active plan: ${appContext.activePlan}` : `Piano attivo: ${appContext.activePlan}`,
    );
  }
  if (appContext.agencyCode) {
    lines.push(
      lang === 'en'
        ? `Connected agency team: ${appContext.agencyCode}`
        : `Team agenzia collegato: ${appContext.agencyCode}`,
    );
  }
  if (appContext.metrics) {
    const m = appContext.metrics;
    lines.push(
      lang === 'en'
        ? `CRM Metrics: Total=${m.total ?? 0}, Active=${m.active ?? 0}, Closed won=${m.won ?? 0}, Lost=${m.lost ?? 0}, Reminders due=${m.remindersDue ?? 0}, Conversion=${m.conversionRate ?? 0}%`
        : `Metriche CRM: Totale=${m.total ?? 0}, Attive=${m.active ?? 0}, Chiuse positive=${m.won ?? 0}, Perse=${m.lost ?? 0}, Richiami in scadenza=${m.remindersDue ?? 0}, Conversione=${m.conversionRate ?? 0}%`,
    );
  }

  const clients = Array.isArray(appContext.clients) ? appContext.clients.slice(0, 60) : [];
  if (clients.length === 0) {
    lines.push(lang === 'en' ? 'Active client records: 0.' : 'Archivio clienti attivi: 0 schede.');
  } else {
    lines.push(
      lang === 'en'
        ? `Active client records (${clients.length}):`
        : `Schede clienti attive (${clients.length}):`,
    );
    for (const c of clients) {
      const priceStr =
        typeof c.price === 'number' && c.price > 0
          ? `€${c.price.toLocaleString(lang === 'en' ? 'en-US' : 'it-IT')}`
          : lang === 'en'
            ? 'Price N/A'
            : 'Prezzo N/D';
      const sqmStr = typeof c.sqm === 'number' && c.sqm > 0 ? `${c.sqm}mq` : '';
      const zoneStr = c.zone || c.address || (lang === 'en' ? 'Area N/A' : 'Zona N/D');
      const tagsStr = Array.isArray(c.tags) && c.tags.length > 0 ? ` [${c.tags.join(', ')}]` : '';
      const remStr = c.reminderDate
        ? ` | ${lang === 'en' ? 'Follow-up' : 'Richiamo'}: ${c.reminderDate}`
        : '';
      const favStr = c.isFavorite ? ' ★' : '';
      lines.push(
        `- ${c.name}${favStr} (${c.role}, ${c.status}): ${c.propertyType} ${sqmStr} ${lang === 'en' ? 'in' : 'a'} ${zoneStr}, ${priceStr}${tagsStr}${remStr}`.replace(
          /\s+/g,
          ' ',
        ),
      );
    }
  }

  return lines.join('\n');
}

export function buildChatbotSystemInstruction(
  appContext?: ChatbotAppContext,
  lang: 'it' | 'en' = 'it',
): string {
  const contextBlock = buildAppContextSummary(appContext, lang);
  if (lang === 'en') {
    return [
      'You are the Official Real Estate Assistant of ImmoPulse, a professional CRM for real estate agencies.',
      '',
      'STRICT SCOPE RULES (ALWAYS FOLLOW):',
      '1. Answer EXCLUSIVELY questions regarding:',
      '   a) Real estate agency operations, strategies, regulations, paperwork, acquisitions, rentals, sales, and marketing;',
      '   b) Data, clients, deals, reminders, supply/demand matching, property portals, and features inside the ImmoPulse app;',
      '   c) Property valuations aligned with current market trends (price per sqm, min/avg/max range, rental yield, area factors).',
      '2. POLITE OFF-TOPIC REFUSAL: If the user asks questions unrelated to real estate, market valuations, or ImmoPulse data (e.g., recipes, sports, gossip, generic coding, unrelated math), politely decline in English explaining that you specialize strictly in real estate agencies, ImmoPulse data analysis, and property market valuations.',
      '3. PROPERTY VALUATIONS: Whenever the user asks for a property valuation (via chat or structured form), run an up-to-date Google Search and always provide clearly:',
      '   - Estimated value per square meter (€/sqm Min - Avg - Max) for the requested city/area;',
      '   - Estimated overall property value (€ Min - Avg - Max) factoring floor area, floor level, condition, and amenities;',
      '   - Indicative monthly rental estimate and gross annual yield;',
      '   - Brief analysis of key local market drivers.',
      '   Always state that the estimate is indicative and based on current market data to support the agent on-site inspection.',
      '4. IN-APP DATA ANALYSIS: When asked about clients or reminders in the app, base your answers strictly on the records below without inventing names or numbers.',
      '5. LANGUAGE & STYLE: Always reply in clear, professional, concise English.',
      '',
      'CURRENT IMMOPULSE APP CONTEXT:',
      contextBlock,
    ].join('\n');
  }
  return [
    'Sei l’Assistente Immobiliare Ufficiale di ImmoPulse, un CRM professionale per agenzie immobiliari italiane.',
    '',
    'REGOLE ASSOLUTE DI AMBITO (DA RISPETTARE SEMPRE):',
    '1. Rispondi ESCLUSIVAMENTE a domande riguardanti:',
    '   a) Attività, strategie, normativa, modulistica, acquisizione, locazione, compravendita e marketing per agenzie immobiliari;',
    '   b) Dati, clienti, trattative, promemoria, matching domanda/offerta, portali immobiliari e funzionalità presenti nell’app ImmoPulse;',
    '   c) Valutazioni immobiliari in linea con l’andamento attuale del mercato italiano (prezzi al mq, forchetta min/medio/max, resa locativa, fattori di zona).',
    '2. RIFIUTO CORTESE FUORI TEMA: Se l’utente pone domande non correlate al settore immobiliare, alle valutazioni di mercato o ai dati di ImmoPulse (es. ricette, sport, gossip, programmazione informatica generica, matematica scolastica non immobiliare), rifiuta educatamente in italiano spiegando che sei specializzato esclusivamente per agenzie immobiliari, analisi dei dati in ImmoPulse e valutazioni immobiliari di mercato.',
    '3. VALUTAZIONI IMMOBILIARI: Quando l’utente chiede una valutazione di un immobile (in chat o tramite scheda strutturata), effettua una ricerca di mercato aggiornata con Google Search e fornisci sempre in modo chiaro e ben strutturato:',
    '   - Valore stimato al metro quadro (€/mq Minimo - Medio - Massimo) riferito alla città/zona richiesta;',
    '   - Valore complessivo stimato dell’immobile (€ Min - Medio - Max) considerando superficie, piano, condizioni e pertinenze;',
    '   - Stima indicativa del canone di affitto mensile e rendimento lordo annuo;',
    '   - Breve analisi dei principali fattori di mercato della zona.',
    '   Specifica sempre che la stima è indicativa e basata sui dati di mercato correnti, utile come supporto al sopralluogo dell’agente.',
    '4. ANALISI DATI IN APP: Quando ti vengono chieste informazioni sui clienti o promemoria dell’app, rispondi basandoti rigorosamente sulle schede riportate nel contesto sottostante senza inventare nomi o numeri inesistenti.',
    '5. LINGUA E STILE: Rispondi sempre in italiano chiaro, professionale e sintetico.',
    '',
    'CONTESTO ATTUALE DELL’APP IMMOPULSE:',
    contextBlock,
  ].join('\n');
}

export function buildValuationPrompt(
  input: PropertyValuationInput,
  lang: 'it' | 'en' = 'it',
): string {
  if (lang === 'en') {
    const parts = [
      'Property valuation request aligned with current market trends:',
      `- City: ${input.city.trim()}`,
      `- Area / District: ${input.zone.trim() || 'Not specified'}`,
      `- Property Type: ${input.propertyType.trim() || 'Apartment'}`,
      `- Commercial Floor Area: ${input.sqm} sqm`,
    ];
    if (input.rooms?.trim()) parts.push(`- Rooms: ${input.rooms.trim()}`);
    if (input.floor?.trim()) parts.push(`- Floor: ${input.floor.trim()}`);
    if (input.condition?.trim()) parts.push(`- Property condition: ${input.condition.trim()}`);
    if (input.notes?.trim()) parts.push(`- Details & amenities: ${input.notes.trim()}`);
    parts.push(
      'Provide up-to-date €/sqm estimates for this area, total estimated value (Min, Avg, Max), indicative monthly rental income, and key valuation drivers.',
    );
    return parts.join('\n');
  }
  const parts = [
    `Richiesta di valutazione immobiliare in linea con il mercato attuale:`,
    `- Città: ${input.city.trim()}`,
    `- Zona / Quartiere: ${input.zone.trim() || 'Non specificata'}`,
    `- Tipologia: ${input.propertyType.trim() || 'Appartamento'}`,
    `- Superficie commerciale: ${input.sqm} mq`,
  ];
  if (input.rooms?.trim()) parts.push(`- Locali: ${input.rooms.trim()}`);
  if (input.floor?.trim()) parts.push(`- Piano: ${input.floor.trim()}`);
  if (input.condition?.trim()) parts.push(`- Stato immobile: ${input.condition.trim()}`);
  if (input.notes?.trim()) parts.push(`- Dettagli e pertinenze: ${input.notes.trim()}`);
  parts.push(
    'Fornisci stima €/mq aggiornata al mercato corrente per questa zona, valore totale stimato (Minimo, Medio, Massimo), possibile canone mensile di locazione e fattori chiave della valutazione.',
  );
  return parts.join('\n');
}

export function extractGroundingSources(response: GenerateContentResponse): GroundedSource[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];

  const seen = new Set<string>();
  const sources: GroundedSource[] = [];
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    const title = chunk?.web?.title?.trim() || uri;
    let domain = '';
    try {
      domain = new URL(uri).hostname.replace(/^www\./, '');
    } catch {
      domain = '';
    }
    sources.push({ title, uri, domain });
  }
  return sources;
}

export function normalizePortalSearchTargets(
  rawPortals: unknown,
): Array<{ name: string; url: string; domain: string }> {
  if (!Array.isArray(rawPortals)) return [];
  const targets: Array<{ name: string; url: string; domain: string }> = [];
  const seenDomains = new Set<string>();

  for (const item of rawPortals) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Partial<PropertyPortalConfig>;
    if (p.enabled === false || typeof p.url !== 'string') continue;
    const normalizedUrl = normalizePortalUrl(p.url);
    if (!normalizedUrl) continue;
    const domain = extractPortalHostname(normalizedUrl);
    if (!domain || seenDomains.has(domain)) continue;
    seenDomains.add(domain);
    targets.push({
      name: typeof p.name === 'string' && p.name.trim() ? p.name.trim() : domain,
      url: normalizedUrl,
      domain,
    });
  }

  return targets;
}

function extractSdkErrorDetails(
  err: unknown,
  lang: 'it' | 'en' = 'it',
): { status?: number; message: string } {
  if (!err || typeof err !== 'object') {
    return {
      message:
        lang === 'en'
          ? 'Unexpected error while calling the AI service.'
          : 'Errore imprevisto durante la chiamata al servizio AI.',
    };
  }
  const e = err as { status?: number; code?: number; message?: string };
  const rawMessage = typeof e.message === 'string' ? e.message : '';
  let status = typeof e.status === 'number' ? e.status : typeof e.code === 'number' ? e.code : undefined;
  let parsedMessage = rawMessage;

  if (rawMessage.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawMessage) as {
        error?: { code?: number; status?: string; message?: string };
      };
      if (parsed?.error) {
        if (typeof parsed.error.code === 'number') status = parsed.error.code;
        if (typeof parsed.error.message === 'string') parsedMessage = parsed.error.message;
      }
    } catch {
      // keep original rawMessage
    }
  }

  if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message:
        lang === 'en'
          ? 'Gemini daily/per-minute quota temporarily exceeded. Please try again shortly or check your API key plan in Settings > Secrets.'
          : 'Quota giornaliera/al minuto del servizio Gemini temporaneamente esaurita. Riprova tra poco o verifica il piano della chiave in Settings > Secrets.',
    };
  }
  if (status === 401 || status === 403 || rawMessage.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message:
        lang === 'en'
          ? 'Invalid or unauthorized Gemini API key. Verify configuration in Settings > Secrets.'
          : 'Chiave API Gemini non valida o non autorizzata. Verifica la configurazione in Settings > Secrets.',
    };
  }

  return {
    status,
    message:
      parsedMessage ||
      (lang === 'en'
        ? 'Error communicating with the AI model.'
        : 'Errore nella comunicazione con il modello AI.'),
  };
}

export class GeminiHttpError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'GeminiHttpError';
    this.status = status;
  }
}

export async function runRealEstateChat(params: {
  messages: ChatTurnInput[];
  appContext?: ChatbotAppContext;
  valuationRequest?: PropertyValuationInput;
  lang?: 'it' | 'en';
}): Promise<{ reply: string; sources: GroundedSource[] }> {
  const lang: 'it' | 'en' = params.lang === 'en' ? 'en' : 'it';
  const ai = getGeminiClient();

  const sanitizedTurns: ChatTurnInput[] = Array.isArray(params.messages)
    ? params.messages
        .filter(
          (m): m is ChatTurnInput =>
            Boolean(m) &&
            (m.role === 'user' || m.role === 'model') &&
            typeof m.text === 'string' &&
            m.text.trim().length > 0,
        )
        .slice(-16)
    : [];

  if (params.valuationRequest) {
    const sqmNum = Number(params.valuationRequest.sqm);
    if (!params.valuationRequest.city?.trim() || !Number.isFinite(sqmNum) || sqmNum <= 0) {
      throw new GeminiHttpError(
        lang === 'en'
          ? 'Enter at least a city and a valid floor area in sqm for the valuation.'
          : 'Inserisci almeno la città e una superficie valida in mq per la valutazione.',
        400,
      );
    }
    sanitizedTurns.push({
      role: 'user',
      text: buildValuationPrompt({ ...params.valuationRequest, sqm: sqmNum }, lang),
    });
  }

  if (sanitizedTurns.length === 0) {
    throw new GeminiHttpError(
      lang === 'en'
        ? 'Enter a message to start chatting with the assistant.'
        : 'Inserisci un messaggio per avviare la conversazione con l’assistente.',
      400,
    );
  }

  const contents = sanitizedTurns.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text.trim() }],
  }));

  let response: GenerateContentResponse;
  try {
    response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction: buildChatbotSystemInstruction(params.appContext, lang),
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
  } catch (err: unknown) {
    const details = extractSdkErrorDetails(err, lang);
    throw new GeminiHttpError(details.message, details.status || 502);
  }

  const reply = response.text?.trim();
  if (!reply) {
    throw new GeminiHttpError(
      lang === 'en'
        ? 'Empty response received from the AI model. Please try again shortly.'
        : 'Risposta vuota ricevuta dal modello AI. Riprova tra qualche istante.',
      502,
    );
  }

  return {
    reply,
    sources: extractGroundingSources(response),
  };
}

export async function runMultiPortalSearch(params: {
  query: string;
  filters?: Partial<PortalSearchFilters>;
  portals: unknown;
  lang?: 'it' | 'en';
}): Promise<PortalSearchResponse> {
  const lang: 'it' | 'en' = params.lang === 'en' ? 'en' : 'it';
  const combinedQuery = buildSearchQueryWithFilters(
    typeof params.query === 'string' ? params.query : '',
    params.filters,
  );
  if (!combinedQuery) {
    throw new GeminiHttpError(
      lang === 'en'
        ? 'Enter what you are looking for or select at least one filter (e.g., city, property type, or price).'
        : 'Inserisci cosa stai cercando o seleziona almeno un filtro (es. città, tipologia o prezzo).',
      400,
    );
  }

  const targets = normalizePortalSearchTargets(params.portals);
  if (targets.length === 0) {
    throw new GeminiHttpError(
      lang === 'en'
        ? 'Enable or add at least one real estate portal to run the search.'
        : 'Attiva o aggiungi almeno un portale immobiliare per eseguire la ricerca.',
      400,
    );
  }

  const ai = getGeminiClient();
  const siteFilter = targets.map((t) => `site:${t.domain}`).join(' OR ');
  const portalNames = targets.map((t) => `${t.name} (${t.domain})`).join(', ');

  const prompt =
    lang === 'en'
      ? [
          `Search for real property listings matching this query: "${combinedQuery}"`,
          `Run the search simultaneously across all configured real estate portals: ${portalNames}.`,
          `Use this guiding Google Search query: ${combinedQuery} (${siteFilter})`,
          'Summarize in English inside the app the main listings found across the different portals (area, property type, price, and indicative size), grouped by portal where possible, so the user can review the overview in-app and open the portal link only for full details.',
        ].join('\n')
      : [
          `Cerca annunci e schede immobiliari reali corrispondenti a questa ricerca: "${combinedQuery}"`,
          `Esegui la ricerca contemporaneamente su tutti i portali immobiliari italiani configurati: ${portalNames}.`,
          `Usa questa query orientativa su Google Search: ${combinedQuery} (${siteFilter})`,
          'Riassumi in italiano all’interno dell’app i risultati principali trovati nei diversi portali (zona, tipologia, prezzo e metratura indicativa) suddividendoli per portale dove possibile, così l’utente possa consultare la panoramica in app e aprire il link del singolo portale solo per i dettagli completi.',
        ].join('\n');

  let response: GenerateContentResponse;
  try {
    response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          lang === 'en'
            ? 'You are a real estate search engine for property agents. Reply in concise English summarizing real listings found via Google Search simultaneously across the specified portals.'
            : 'Sei un motore di ricerca immobiliare per agenti italiani. Rispondi in italiano sintetico riassumendo gli annunci reali trovati tramite Google Search contemporaneamente sui portali specificati.',
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
  } catch (err: unknown) {
    const details = extractSdkErrorDetails(err, lang);
    throw new GeminiHttpError(details.message, details.status || 502);
  }

  const rawSources = extractGroundingSources(response);
  const targetDomains = new Set(targets.map((t) => t.domain));

  const mapped: PortalSearchResultItem[] = rawSources.map((src) => {
    const matchingPortal = targets.find((t) => src.domain && src.domain.endsWith(t.domain));
    return {
      title: src.title,
      uri: src.uri,
      domain: src.domain || (lang === 'en' ? 'portal' : 'portale'),
      portalName: matchingPortal?.name,
    };
  });

  // Prioritize links that directly belong to the configured portal domains
  mapped.sort((a, b) => {
    const aMatch = Array.from(targetDomains).some((d) => a.domain.endsWith(d)) ? 0 : 1;
    const bMatch = Array.from(targetDomains).some((d) => b.domain.endsWith(d)) ? 0 : 1;
    return aMatch - bMatch;
  });

  return {
    summary:
      response.text?.trim() ||
      (lang === 'en'
        ? 'Simultaneous search completed across selected portals. Open a listing only to view full details on the portal.'
        : 'Ricerca simultanea completata sui portali selezionati. Apri un annuncio solo per verificare i dettagli completi sul portale.'),
    results: mapped,
  };
}
