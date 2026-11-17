import type { PlanTier } from '../types/crm';
import type { AppLanguage } from './i18n';

export const LEGAL_OWNER_NAME = 'Gianpio Carbonelli';
export const SUPPORT_EMAIL = 'gianpio.carbonelli@gmail.com';
export const STRIPE_CUSTOMER_PORTAL_URL =
  'https://billing.stripe.com/p/login/INSERISCI_LINK_PORTALE';
export const STRIPE_MONTHLY_CHECKOUT_URL =
  'https://buy.stripe.com/eVqaEWawH6BfdXo0IZ1B606';
export const STRIPE_ANNUAL_CHECKOUT_URL =
  'https://buy.stripe.com/14A4gy8oz2kZf1s1N31B607';
export const STRIPE_PRO_CHECKOUT_URL =
  'https://buy.stripe.com/dRm28q34f6Bff1s77n1B605';

export type LegalDocKey = 'privacy' | 'terms' | 'dpa' | 'cookies';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  key: LegalDocKey;
  shortLabel: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const LEGAL_DOCUMENTS: Record<LegalDocKey, LegalDocument> = {
  privacy: {
    key: 'privacy',
    shortLabel: 'Privacy Policy',
    title: 'Informativa sulla Privacy (Privacy Policy)',
    subtitle: `Ai sensi dell’art. 13 del Regolamento (UE) 2016/679 (GDPR) — Titolare: ${LEGAL_OWNER_NAME}`,
    lastUpdated: '15 Novembre 2026',
    sections: [
      {
        heading: '1. Titolare del Trattamento e Contatti',
        paragraphs: [
          `Il Titolare del trattamento dei dati personali relativi all’uso della piattaforma ImmoPulse CRM è ${LEGAL_OWNER_NAME}, contattabile all’indirizzo email ${SUPPORT_EMAIL} per qualsiasi richiesta informativa, segnalazione o esercizio dei diritti previsti dalla normativa vigente.`,
        ],
      },
      {
        heading: '2. Modalità di Salvataggio: Locale (Free/Singolo) e Cloud (Agenzia/Team)',
        paragraphs: [
          'Per gli utenti in modalità Ospite / Free e per gli abbonati al piano Singolo Pro, tutte le schede clienti, gli immobili, i promemoria, le etichette, la cronologia contatti e le fotografie allegate sono memorizzati esclusivamente in locale all’interno del browser dell’utente (localStorage). Tali dati non vengono trasmessi né archiviati su server centralizzati di ImmoPulse CRM.',
          'Per gli utenti del piano Agenzia / Team, i dati dell’agenda condivisi mediante Codice Agenzia vengono sincronizzati in tempo reale attraverso infrastruttura cloud dedicata e cifrata, consentendo l’accesso coordinato ai dispositivi autorizzati del team.',
          'Le richieste facoltative rivolte all’Assistente AI o alla ricerca portali trasmettono esclusivamente i parametri necessari all’elaborazione della risposta.',
        ],
      },
      {
        heading: '3. Gestione Sicura dei Pagamenti tramite Stripe',
        paragraphs: [
          'La sottoscrizione dei piani a pagamento (Singolo Pro e Agenzia / Team), i rinnovi, le ricevute fiscali e l’aggiornamento del metodo di pagamento sono gestiti interamente dalla piattaforma esterna certificata PCI-DSS Stripe.',
          'ImmoPulse CRM non raccoglie, non elabora e non conserva numeri di carta di credito, codici CVV o coordinate bancarie dell’utente.',
        ],
      },
      {
        heading: '4. Clausola di Esonero di Responsabilità per Cache e Memoria Locale',
        paragraphs: [
          'Poiché i dati degli account Free e Singolo Pro risiedono esclusivamente nella memoria locale del dispositivo (localStorage), l’utente è invitato a scaricare regolarmente una copia di sicurezza tramite la funzione Backup (.JSON).',
          `Il Titolare ${LEGAL_OWNER_NAME} e ImmoPulse CRM sono espressamente esonerati da qualsiasi responsabilità in caso di perdita parziale o totale dei dati causata da cancellazione accidentale della cache o cronologia del browser da parte dell’utente, utilizzo di sessioni in incognito, formattazione o sostituzione del dispositivo senza preventivo salvataggio di un backup.`,
        ],
      },
      {
        heading: '5. Diritti dell’Interessato',
        paragraphs: [
          `L’utente può esercitare in ogni momento i diritti di accesso, rettifica, cancellazione, limitazione, opposizione e portabilità dei propri dati ai sensi degli artt. 15–22 GDPR scrivendo a ${SUPPORT_EMAIL}, nonché esportare o eliminare autonomamente i record salvati sul proprio browser.`,
        ],
      },
    ],
  },
  terms: {
    key: 'terms',
    shortLabel: 'Termini e Condizioni',
    title: 'Termini e Condizioni di Servizio',
    subtitle: `Condizioni generali di licenza d’uso di ImmoPulse CRM — Gestore: ${LEGAL_OWNER_NAME}`,
    lastUpdated: '15 Novembre 2026',
    sections: [
      {
        heading: '1. Oggetto del Servizio',
        paragraphs: [
          `ImmoPulse CRM è un applicativo gestionale web e PWA dedicato ad agenti e agenzie immobiliari, fornito e amministrato da ${LEGAL_OWNER_NAME} (${SUPPORT_EMAIL}). L’utilizzo dell’app comporta l’accettazione integrale delle presenti condizioni.`,
        ],
      },
      {
        heading: '2. Piani Tariffari e Divieto di Condivisione Account (Singolo Pro)',
        paragraphs: [
          'Il piano Ospite / Free (€ 0/mese) consente la gestione di massimo 3 clienti attivi con funzioni base (Chiama ed Email).',
          'I piani individuali Licenza ImmoPulse (€ 14,90/mese) e Licenza Agente ImmoPulse Pro (€ 99,00/anno) concedono una licenza d’uso strettamente personale e non trasferibile. È espressamente vietata la condivisione dell’account, delle credenziali di accesso o della licenza personale con altri agenti, colleghi o collaboratori. La violazione del divieto comporta la sospensione immediata del piano senza rimborso.',
          'Per la collaborazione simultanea tra più agenti e dispositivi (PC, tablet e smartphone) e operatività avanzata è disponibile la Licenza Agenzia ImmoPulse Pro (149,00 € / anno).',
        ],
      },
      {
        heading: '3. Pagamenti tramite Stripe, Portale Clienti e Scadenze',
        paragraphs: [
          'Tutti i pagamenti sono elaborati in sicurezza tramite la piattaforma esterna Stripe. Attraverso il pulsante dedicato "Gestisci Abbonamento / Fatture", l’utente può accedere al portale clienti Stripe per scaricare ricevute, aggiornare la carta o disdire autonomamente in qualsiasi momento.',
          'Cinque giorni prima della scadenza del ciclo attivo viene mostrato un promemoria nell’interfaccia. Al mancato rinnovo entro la data di scadenza, l’account ritorna automaticamente al piano Free con ripristino del limite di 3 clienti attivi.',
        ],
      },
      {
        heading: '4. Conservazione Locale ed Esonero di Responsabilità',
        paragraphs: [
          'Per gli utenti Free e Singolo Pro i dati restano salvati in locale (localStorage) sul dispositivo in uso; per il piano Agenzia / Team è attiva anche la sincronizzazione cloud della stanza agenzia.',
          `L’utente riconosce che l’eventuale svuotamento della cache o dei dati dei siti nel browser comporta l’azzeramento dell’archivio locale e solleva ${LEGAL_OWNER_NAME} da qualsiasi responsabilità per perdite di contatti o documenti dovute a mancata esportazione periodica del backup .JSON.`,
        ],
      },
    ],
  },
  dpa: {
    key: 'dpa',
    shortLabel: 'Accordo GDPR (DPA)',
    title: 'Accordo sul Trattamento dei Dati (GDPR — DPA)',
    subtitle: 'Clausola standard ai sensi dell’art. 28 del Regolamento (UE) 2016/679',
    lastUpdated: '15 Novembre 2026',
    sections: [
      {
        heading: '1. Ruoli delle Parti ai sensi del Regolamento UE 2016/679',
        paragraphs: [
          'In conformità all’art. 28 del Regolamento (UE) 2016/679 (GDPR), l’Agenzia Immobiliare o il Professionista utilizzatore resta ad ogni effetto unico Titolare del trattamento (Data Controller) dei dati personali dei propri clienti finali (acquirenti, venditori, inquilini, locatori), incluse eventuali fotografie, recapiti, preferenze e annotazioni inserite nel CRM.',
          `ImmoPulse CRM (gestito da ${LEGAL_OWNER_NAME}, email ${SUPPORT_EMAIL}) agisce esclusivamente in qualità di Responsabile del trattamento (Data Processor), limitandosi a fornire gli strumenti tecnici dell’applicazione secondo le istruzioni documentate dal Titolare.`,
        ],
      },
      {
        heading: '2. Architettura Locale e Sincronizzazione Cloud Agenzia',
        paragraphs: [
          'Nei piani Free e Singolo Pro i dati dei clienti finali vengono memorizzati esclusivamente in locale nel browser del Titolare (localStorage), senza transito su archivi cloud centrali del Responsabile.',
          'Nel piano Agenzia / Team, la sincronizzazione cloud in tempo reale tra i dispositivi collegati mediante Codice Agenzia avviene esclusivamente per conto e su iniziativa del Titolare al fine di coordinare l’operatività interna dell’agenzia.',
        ],
      },
      {
        heading: '3. Obblighi del Responsabile, Sub-responsabili e Sicurezza',
        paragraphs: [
          'Il Responsabile adotta misure tecniche e organizzative adeguate ai sensi dell’art. 32 GDPR per proteggere i canali di trasmissione e sincronizzazione, nonché si avvale di sub-responsabili qualificati quali Stripe esclusivamente per la gestione sicura dei pagamenti e della fatturazione.',
          'Resta esclusa ogni responsabilità del Responsabile per la perdita di dati locali causata da cancellazione accidentale della cache/cronologia del browser da parte del Titolare o dei propri collaboratori.',
        ],
      },
      {
        heading: '4. Portabilità, Cancellazione e Assistenza',
        paragraphs: [
          `Il Titolare può esportare in qualsiasi momento tutti i dati dei propri clienti in formato aperto (.CSV o .JSON) tramite la sezione Backup. Per qualsiasi chiarimento o esercizio di diritti collegati al presente DPA è disponibile il contatto diretto ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
  cookies: {
    key: 'cookies',
    shortLabel: 'Cookie & Dati Locali',
    title: 'Informativa Cookie & Dati Locali (localStorage)',
    subtitle: `Trasparenza sull’archiviazione tecnica su dispositivo e cache offline — ${LEGAL_OWNER_NAME}`,
    lastUpdated: '15 Novembre 2026',
    sections: [
      {
        heading: '1. Nessun Cookie di Profilazione',
        paragraphs: [
          'ImmoPulse CRM non utilizza cookie pubblicitari, pixel di tracciamento o cookie di profilazione commerciale di terze parti.',
        ],
      },
      {
        heading: '2. Utilizzo di localStorage e Service Worker PWA',
        paragraphs: [
          'Per gli utenti Free e Singolo Pro, i dati dell’agenda CRM (clienti, filtri, impostazioni portali immobiliari, sessione locale e stato piano) vengono salvati nella memoria tecnica del browser (localStorage). L’app utilizza inoltre la cache del Service Worker PWA esclusivamente per garantire l’avvio rapido e l’utilizzo anche in assenza di connessione.',
          'Gli abbonati al piano Agenzia / Team abbinano alla memoria locale la sincronizzazione cloud cifrata in tempo reale verso i dispositivi collegati con lo stesso Codice Agenzia.',
        ],
      },
      {
        heading: '3. Cookie Esterni in Fase di Pagamento (Stripe)',
        paragraphs: [
          'Durante l’accesso al Portale Clienti Stripe ("Gestisci Abbonamento / Fatture") o alla procedura di checkout esterno, il provider Stripe può impostare cookie tecnici strettamente necessari alla sicurezza antifrode e all’autenticazione della sessione di pagamento secondo la propria informativa.',
        ],
      },
      {
        heading: '4. Avviso Cancellazione Cache ed Esonero Responsabilità',
        paragraphs: [
          `La pulizia manuale di "Cookie e dati dei siti" o della cronologia/cache del browser cancella irreversibilmente gli archivi salvati in localStorage. ${LEGAL_OWNER_NAME} (${SUPPORT_EMAIL}) non risponde della perdita di schede dovuta a tale operazione; si raccomanda di scaricare periodicamente il file di Backup (.JSON).`,
        ],
      },
    ],
  },
};

export const LEGAL_DOCUMENTS_EN: Record<LegalDocKey, LegalDocument> = {
  privacy: {
    key: 'privacy',
    shortLabel: 'Privacy Policy',
    title: 'Privacy Policy',
    subtitle: `Pursuant to Art. 13 of Regulation (EU) 2016/679 (GDPR) — Data Controller: ${LEGAL_OWNER_NAME}`,
    lastUpdated: 'November 15, 2026',
    sections: [
      {
        heading: '1. Data Controller and Contact Details',
        paragraphs: [
          `The Data Controller for personal data related to the use of the ImmoPulse CRM platform is ${LEGAL_OWNER_NAME}, who can be contacted via email at ${SUPPORT_EMAIL} for any information request, notice, or exercise of rights provided by applicable law.`,
        ],
      },
      {
        heading: '2. Storage Architecture: Local (Free/Individual) and Cloud (Agency/Team)',
        paragraphs: [
          'For Guest / Free users and Individual Pro plan subscribers, all client cards, properties, reminders, tags, contact history, and attached photos are stored exclusively locally inside the user’s browser (localStorage). These data are neither transmitted to nor stored on central ImmoPulse CRM servers.',
          'For Agency / Team plan users, agenda data shared via an Agency Code are synchronized in real time through a dedicated encrypted cloud infrastructure, allowing coordinated access across authorized team devices.',
          'Optional requests sent to the AI Assistant or property portal search transmit only the parameters necessary to generate the response.',
        ],
      },
      {
        heading: '3. Secure Payment Processing via Stripe',
        paragraphs: [
          'Subscriptions to paid plans (Individual Pro and Agency / Team), renewals, tax receipts, and payment method updates are handled entirely by the PCI-DSS certified external platform Stripe.',
          'ImmoPulse CRM never collects, processes, or stores credit card numbers, CVV codes, or user bank details.',
        ],
      },
      {
        heading: '4. Liability Waiver for Browser Cache and Local Storage',
        paragraphs: [
          'Because data for Free and Individual Pro accounts reside exclusively in the device’s local memory (localStorage), users are advised to regularly download a backup copy using the Backup (.JSON) feature.',
          `The Owner ${LEGAL_OWNER_NAME} and ImmoPulse CRM are expressly released from any liability in the event of partial or total data loss caused by accidental clearing of browser cache or browsing history by the user, use of incognito sessions, formatting, or device replacement without a prior backup.`,
        ],
      },
      {
        heading: '5. Data Subject Rights',
        paragraphs: [
          `Users may at any time exercise their rights of access, rectification, erasure, restriction, objection, and data portability under Articles 15–22 GDPR by writing to ${SUPPORT_EMAIL}, as well as independently export or delete records stored in their browser.`,
        ],
      },
    ],
  },
  terms: {
    key: 'terms',
    shortLabel: 'Terms & Conditions',
    title: 'Terms and Conditions of Service',
    subtitle: `General license terms for ImmoPulse CRM — Operator: ${LEGAL_OWNER_NAME}`,
    lastUpdated: 'November 15, 2026',
    sections: [
      {
        heading: '1. Scope of Service',
        paragraphs: [
          `ImmoPulse CRM is a web and PWA management application designed for real estate agents and agencies, provided and administered by ${LEGAL_OWNER_NAME} (${SUPPORT_EMAIL}). Using the app constitutes full acceptance of these terms.`,
        ],
      },
      {
        heading: '2. Subscription Plans and Account-Sharing Prohibition (Individual Pro)',
        paragraphs: [
          'The Guest / Free plan (€ 0/month) allows managing up to 3 active clients with basic features (Call and Email).',
          'Individual plans ImmoPulse License (14,90 € / month) and ImmoPulse Agent Pro License (99,00 € / year) grant a strictly personal and non-transferable license. Sharing accounts, login credentials, or personal licenses with other agents, colleagues, or collaborators is strictly prohibited. Violation results in immediate plan suspension without refund.',
          'For simultaneous multi-agent and multi-device collaboration (PC, tablet, and smartphone) and advanced team operations, the ImmoPulse Agency Pro License (149,00 € / year) is available.',
        ],
      },
      {
        heading: '3. Stripe Payments, Customer Portal, and Expirations',
        paragraphs: [
          'All payments are securely processed through the external Stripe platform. Using the dedicated "Manage Subscription / Invoices" button, users can access the Stripe Customer Portal to download receipts, update their card, or cancel independently at any time.',
          'Five days before the active cycle expires, a reminder banner appears in the interface. Upon non-renewal by the expiration date, the account automatically reverts to the Free plan with the 3 active clients limit restored.',
        ],
      },
      {
        heading: '4. Local Storage and Limitation of Liability',
        paragraphs: [
          'For Free and Individual Pro users, data remain stored locally (localStorage) on the device in use; for the Agency / Team plan, real-time cloud synchronization for the agency room is also active.',
          `The user acknowledges that clearing browser cache or site data resets the local archive and releases ${LEGAL_OWNER_NAME} from any liability for lost contacts or documents resulting from failure to periodically export a .JSON backup.`,
        ],
      },
    ],
  },
  dpa: {
    key: 'dpa',
    shortLabel: 'GDPR Agreement (DPA)',
    title: 'Data Processing Agreement (GDPR — DPA)',
    subtitle: 'Standard clause pursuant to Art. 28 of Regulation (EU) 2016/679',
    lastUpdated: 'November 15, 2026',
    sections: [
      {
        heading: '1. Roles of the Parties under EU Regulation 2016/679',
        paragraphs: [
          'In accordance with Art. 28 of Regulation (EU) 2016/679 (GDPR), the Real Estate Agency or Professional user remains for all purposes the sole Data Controller of personal data belonging to their end clients (buyers, sellers, tenants, landlords), including any photos, contact details, preferences, and notes entered into the CRM.',
          `ImmoPulse CRM (operated by ${LEGAL_OWNER_NAME}, email ${SUPPORT_EMAIL}) acts solely as Data Processor, limiting itself to providing the technical application tools in accordance with the Controller’s documented instructions.`,
        ],
      },
      {
        heading: '2. Local Architecture and Agency Cloud Sync',
        paragraphs: [
          'Under Free and Individual Pro plans, end-client data are stored exclusively locally in the Controller’s browser (localStorage), without passing through central cloud archives of the Processor.',
          'Under the Agency / Team plan, real-time cloud synchronization across devices connected via an Agency Code occurs exclusively on behalf of and on the initiative of the Controller to coordinate internal agency operations.',
        ],
      },
      {
        heading: '3. Processor Obligations, Sub-processors, and Security',
        paragraphs: [
          'The Processor implements appropriate technical and organizational measures under Art. 32 GDPR to safeguard transmission and synchronization channels, and relies on qualified sub-processors such as Stripe solely for secure payment processing and billing.',
          'The Processor bears no responsibility for local data loss caused by accidental clearing of browser cache/history by the Controller or their team members.',
        ],
      },
      {
        heading: '4. Portability, Erasure, and Assistance',
        paragraphs: [
          `The Controller may at any time export all their client data in open formats (.CSV or .JSON) via the Backup section. For any clarification or exercise of rights related to this DPA, direct contact is available at ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
  cookies: {
    key: 'cookies',
    shortLabel: 'Cookies & Local Data',
    title: 'Cookies & Local Data Notice (localStorage)',
    subtitle: `Transparency on technical device storage and offline cache — ${LEGAL_OWNER_NAME}`,
    lastUpdated: 'November 15, 2026',
    sections: [
      {
        heading: '1. No Profiling Cookies',
        paragraphs: [
          'ImmoPulse CRM does not use advertising cookies, tracking pixels, or third-party commercial profiling cookies.',
        ],
      },
      {
        heading: '2. Use of localStorage and PWA Service Worker',
        paragraphs: [
          'For Free and Individual Pro users, CRM agenda data (clients, filters, property portal settings, local session, language preference, and plan status) are saved in the browser’s technical storage (localStorage). The app also uses the PWA Service Worker cache exclusively to enable fast startup and offline usage.',
          'Agency / Team plan subscribers combine local storage with encrypted real-time cloud synchronization across devices connected using the same Agency Code.',
        ],
      },
      {
        heading: '3. External Cookies During Payment (Stripe)',
        paragraphs: [
          'When accessing the Stripe Customer Portal ("Manage Subscription / Invoices") or external checkout, Stripe may set strictly necessary technical cookies for fraud prevention and payment session authentication under its own policy.',
        ],
      },
      {
        heading: '4. Cache Clearing Warning and Liability Waiver',
        paragraphs: [
          `Manually clearing "Cookies and site data" or browser cache/history irreversibly deletes records saved in localStorage. ${LEGAL_OWNER_NAME} (${SUPPORT_EMAIL}) is not responsible for lost records caused by such action; periodically downloading a Backup (.JSON) file is recommended.`,
        ],
      },
    ],
  },
};

export const LEGAL_DOC_ORDER: readonly LegalDocKey[] = ['privacy', 'terms', 'dpa', 'cookies'];

export function getLegalDocumentsMap(lang: AppLanguage = 'it'): Record<LegalDocKey, LegalDocument> {
  return lang === 'en' ? LEGAL_DOCUMENTS_EN : LEGAL_DOCUMENTS;
}

export function getLegalDocument(key: LegalDocKey, lang: AppLanguage = 'it'): LegalDocument {
  return lang === 'en' ? LEGAL_DOCUMENTS_EN[key] : LEGAL_DOCUMENTS[key];
}

export function buildSupportEmailUrl(
  userEmail?: string,
  activePlan?: PlanTier,
  lang: AppLanguage = 'it',
): string {
  if (lang === 'en') {
    const subject = 'Technical Support Request — ImmoPulse CRM';
    const details: string[] = [
      'Hello Gianpio,',
      '',
      'I am requesting technical support for ImmoPulse CRM.',
    ];
    if (userEmail) {
      details.push(`Account: ${userEmail}`);
    }
    if (activePlan) {
      details.push(`Current plan: ${activePlan.toUpperCase()}`);
    }
    details.push('', 'Request details:');
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      details.join('\n'),
    )}`;
  }

  const subject = 'Richiesta Supporto Tecnico — ImmoPulse CRM';
  const details: string[] = [
    'Salve Gianpio,',
    '',
    'richiedo assistenza tecnica per ImmoPulse CRM.',
  ];
  if (userEmail) {
    details.push(`Account: ${userEmail}`);
  }
  if (activePlan) {
    details.push(`Piano attuale: ${activePlan.toUpperCase()}`);
  }
  details.push('', 'Descrizione della richiesta:');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    details.join('\n'),
  )}`;
}

export function buildSupportWhatsAppUrl(
  userEmail?: string,
  activePlan?: PlanTier,
  lang: AppLanguage = 'it',
): string {
  if (lang === 'en') {
    const lines = [
      'Hi, I need technical support for ImmoPulse CRM.',
      userEmail ? `Account: ${userEmail}` : null,
      activePlan ? `Plan: ${activePlan.toUpperCase()}` : null,
    ].filter(Boolean);
    return `https://wa.me/?text=${encodeURIComponent(lines.join(' | '))}`;
  }
  const lines = [
    'Ciao, richiedo supporto tecnico per ImmoPulse CRM.',
    userEmail ? `Account: ${userEmail}` : null,
    activePlan ? `Piano: ${activePlan.toUpperCase()}` : null,
  ].filter(Boolean);
  return `https://wa.me/?text=${encodeURIComponent(lines.join(' | '))}`;
}
