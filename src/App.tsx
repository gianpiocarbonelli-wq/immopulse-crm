import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Database,
  Download,
  Euro,
  FolderOpen,
  GitCompare,
  LifeBuoy,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  User,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { AgencySyncModal } from './components/AgencySyncModal';
import { AuthModal } from './components/AuthModal';
import { BrandLogo } from './components/BrandLogo';
import { ClientCard } from './components/ClientCard';
import { ClientFormModal } from './components/ClientFormModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DashboardView } from './components/DashboardView';
import { ExportModal } from './components/ExportModal';
import { FindPropertyView } from './components/FindPropertyView';
import { GalleryModal } from './components/GalleryModal';
import { LegalInfoModal } from './components/LegalInfoModal';
import { MatchingView } from './components/MatchingView';
import { MetricsStrip } from './components/MetricsStrip';
import { MultiPortalLauncherModal } from './components/MultiPortalLauncherModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PlansModal } from './components/PlansModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { RealEstateChatbot } from './components/RealEstateChatbot';
import { RemindersView } from './components/RemindersView';
import { useAgencySync } from './hooks/useAgencySync';
import type {
  ActiveTab,
  AgencyWorkspaceConfig,
  BillingCycle,
  ClientRecord,
  ConfirmDialogState,
  PaidPlanTier,
  PropertyPortalConfig,
  SortOption,
  ToastMessage,
  UserAccount,
} from './types/crm';
import {
  applyDeleteClientSync,
  applyLicenseCodeActivation,
  applyPaymentSuccessActivation,
  applyStripePlanActivation,
  applyUpsertClientSync,
  canUseAgencySync,
  canUseWhatsAppAndMap,
  computeMetrics,
  computeSubscriptionExpiry,
  evaluateSubscriptionStatus,
  filterAndSortClients,
  formatCurrencyEUR,
  generateCsvContent,
  generateDemoClients,
  getActivePlan,
  getAvailableTags,
  getClientLimit,
  getClientPhotos,
  getSubscriptionPlanLabel,
  getVisibleClientsPool,
  hasPaidRedirectParam,
  hasPaymentSuccessParam,
  isValidClient,
  localDateTimeValue,
  normalizeClientRecord,
  parseBudgetBound,
  parsePaidRedirectParam,
  reconcileExpiredSubscription,
  resolveBillingCycle,
  type StripeRedirectPlan,
  stripPaidRedirectParam,
  toggleClientFavorite,
} from './utils/crmLogic';
import { useLanguage } from './contexts/LanguageContext';
import { translateSuggestedTag } from './utils/i18n';
import { downloadBlob } from './utils/imageCompression';
import {
  buildSupportEmailUrl,
  buildSupportWhatsAppUrl,
  getLegalDocumentsMap,
  LEGAL_DOC_ORDER,
  LEGAL_OWNER_NAME,
  type LegalDocKey,
} from './utils/legalAndSupport';
import {
  buildRadarPortalUrls,
  extractClientCityAndZone,
  type MultiPortalLaunchItem,
  openMultiPortalWindows,
  parseRoomsCount,
} from './utils/portalSearch';
import {
  clearAgencyWorkspace,
  clearLicenseCode,
  clearProActiveFlag,
  clearSessionEmail,
  getAccounts,
  loadAgencyWorkspace,
  loadPortals,
  loadProActiveFlag,
  loadSavedLicenseCode,
  loadSessionEmail,
  loadStoredClientsRaw,
  saveAccounts,
  saveAgencyWorkspace,
  saveLicenseCode,
  savePortals,
  saveProActiveFlag,
  saveSessionEmail,
  saveStoredClients,
} from './utils/storage';

function loadInitialUserState(): {
  user: UserAccount | null;
  downgradedFrom: PaidPlanTier | null;
  activatedStripePlan: StripeRedirectPlan | null;
  paymentSuccessModal: boolean;
} {
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const isPaymentSuccess = hasPaymentSuccessParam(search);
  const paidRedirectPlan = parsePaidRedirectParam(search);
  const email = loadSessionEmail();
  const accounts = getAccounts();

  if (isPaymentSuccess) {
    const result = applyPaymentSuccessActivation(accounts, email, Date.now());
    saveProActiveFlag(result.activatedAt);
    saveAccounts(result.accounts);
    saveSessionEmail(result.sessionEmail);
    return {
      user: result.activatedUser,
      downgradedFrom: null,
      activatedStripePlan: null,
      paymentSuccessModal: true,
    };
  }

  if (paidRedirectPlan) {
    const result = applyStripePlanActivation(accounts, email, paidRedirectPlan, Date.now());
    saveProActiveFlag(result.activatedUser.activatedAt);
    saveAccounts(result.accounts);
    saveSessionEmail(result.sessionEmail);
    return {
      user: result.activatedUser,
      downgradedFrom: null,
      activatedStripePlan: paidRedirectPlan,
      paymentSuccessModal: false,
    };
  }

  const proFlag = loadProActiveFlag();

  if (!email) {
    if (proFlag.active) {
      const restored = applyPaymentSuccessActivation(
        accounts,
        null,
        Date.now(),
        proFlag.activatedAt,
      );
      saveAccounts(restored.accounts);
      saveSessionEmail(restored.sessionEmail);
      return {
        user: restored.activatedUser,
        downgradedFrom: null,
        activatedStripePlan: null,
        paymentSuccessModal: false,
      };
    }

    const savedLicense = loadSavedLicenseCode();
    if (savedLicense) {
      const licResult = applyLicenseCodeActivation(accounts, null, savedLicense, Date.now());
      if (licResult.ok) {
        saveAccounts(licResult.accounts);
        saveSessionEmail(licResult.sessionEmail);
        return {
          user: licResult.activatedUser,
          downgradedFrom: null,
          activatedStripePlan: null,
          paymentSuccessModal: false,
        };
      }
    }
    return {
      user: null,
      downgradedFrom: null,
      activatedStripePlan: null,
      paymentSuccessModal: false,
    };
  }

  const idx = accounts.findIndex((a) => a.email === email);
  if (idx === -1) {
    if (proFlag.active) {
      const restored = applyPaymentSuccessActivation(
        accounts,
        email,
        Date.now(),
        proFlag.activatedAt,
      );
      saveAccounts(restored.accounts);
      saveSessionEmail(restored.sessionEmail);
      return {
        user: restored.activatedUser,
        downgradedFrom: null,
        activatedStripePlan: null,
        paymentSuccessModal: false,
      };
    }
    return {
      user: null,
      downgradedFrom: null,
      activatedStripePlan: null,
      paymentSuccessModal: false,
    };
  }

  if (proFlag.active && accounts[idx].plan === 'free') {
    const restored = applyPaymentSuccessActivation(
      accounts,
      email,
      Date.now(),
      proFlag.activatedAt,
    );
    saveAccounts(restored.accounts);
    return {
      user: restored.activatedUser,
      downgradedFrom: null,
      activatedStripePlan: null,
      paymentSuccessModal: false,
    };
  }

  const reconciled = reconcileExpiredSubscription(accounts[idx], Date.now());
  if (reconciled.downgradedFrom) {
    if (proFlag.active) {
      const restored = applyPaymentSuccessActivation(
        accounts,
        email,
        Date.now(),
        proFlag.activatedAt,
      );
      saveAccounts(restored.accounts);
      return {
        user: restored.activatedUser,
        downgradedFrom: null,
        activatedStripePlan: null,
        paymentSuccessModal: false,
      };
    }
    const nextAccounts = accounts.map((a, i) => (i === idx ? reconciled.user : a));
    saveAccounts(nextAccounts);
    if (reconciled.downgradedFrom === 'agency') {
      clearAgencyWorkspace();
    }
  }
  return {
    user: reconciled.user,
    downgradedFrom: reconciled.downgradedFrom,
    activatedStripePlan: null,
    paymentSuccessModal: false,
  };
}

function loadInitialClients(initialUser: UserAccount | null): {
  clients: ClientRecord[];
  corrupted: boolean;
} {
  try {
    const raw = loadStoredClientsRaw();
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every(isValidClient)) {
        return { clients: [], corrupted: true };
      }
      return {
        clients: parsed.map(normalizeClientRecord),
        corrupted: false,
      };
    }
    const plan = getActivePlan(initialUser);
    const seed = generateDemoClients(plan === 'pro' || plan === 'agency' ? 50 : 2);
    saveStoredClients(seed);
    return { clients: seed, corrupted: false };
  } catch {
    return { clients: [], corrupted: true };
  }
}

export default function App() {
  const { lang, locale, setLang } = useLanguage();
  const isEn = lang === 'en';
  const legalDocs = useMemo(() => getLegalDocumentsMap(lang), [lang]);

  const [initialBoot] = useState(() => loadInitialUserState());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(initialBoot.user);
  const [initialData] = useState(() => loadInitialClients(initialBoot.user));
  const [clients, setClients] = useState<ClientRecord[]>(initialData.clients);
  const clientsRef = useRef<ClientRecord[]>(initialData.clients);
  clientsRef.current = clients;

  const [corruptedStorage, setCorruptedStorage] = useState<boolean>(initialData.corrupted);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [expiringBannerDismissed, setExpiringBannerDismissed] = useState(false);
  const [stripePaidPlan, setStripePaidPlan] = useState<StripeRedirectPlan | null>(
    initialBoot.activatedStripePlan,
  );
  const [paymentSuccessModalOpen, setPaymentSuccessModalOpen] = useState<boolean>(
    initialBoot.paymentSuccessModal,
  );
  const stripePaidToastSentRef = useRef(false);
  const paymentSuccessCleanedRef = useRef(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [minBudgetInput, setMinBudgetInput] = useState('');
  const [maxBudgetInput, setMaxBudgetInput] = useState('');
  const [withPhotosOnly, setWithPhotosOnly] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  // Modal & sheet states
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authContextMsg, setAuthContextMsg] = useState('');
  const [pendingPlanAfterAuth, setPendingPlanAfterAuth] = useState<PaidPlanTier | null>(null);

  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [plansContextMsg, setPlansContextMsg] = useState('');
  const [preselectedPlan, setPreselectedPlan] = useState<PaidPlanTier | null>(null);
  const [savedLicenseCode, setSavedLicenseCode] = useState<string | null>(() => loadSavedLicenseCode());

  const [agencyModalOpen, setAgencyModalOpen] = useState(false);
  const [agencyWorkspace, setAgencyWorkspace] = useState<AgencyWorkspaceConfig | null>(() =>
    loadAgencyWorkspace(),
  );
  const [portals, setPortals] = useState<PropertyPortalConfig[]>(() => loadPortals());

  const handleUpdatePortals = useCallback((nextPortals: PropertyPortalConfig[]) => {
    setPortals(nextPortals);
    savePortals(nextPortals);
  }, []);

  const [galleryState, setGalleryState] = useState<{
    isOpen: boolean;
    clientName: string;
    photos: string[];
    initialIndex: number;
  }>({ isOpen: false, clientName: '', photos: [], initialIndex: 0 });
  const [portalLauncherState, setPortalLauncherState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    portals: MultiPortalLaunchItem[];
    blockedCount: number;
  }>({ isOpen: false, title: '', portals: [], blockedCount: 0 });

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocKey | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-1), { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    [],
  );

  useEffect(() => {
    if (corruptedStorage) {
      showToast(
        isEn
          ? 'Local archive corrupted: original data was preserved. Please import a valid backup.'
          : 'Archivio locale danneggiato: i dati originali non sono stati sovrascritti. Importa un backup valido.',
        'error',
      );
      setCorruptedStorage(false);
    }
  }, [corruptedStorage, showToast, isEn]);

  useEffect(() => {
    if (initialBoot.activatedStripePlan && !stripePaidToastSentRef.current) {
      stripePaidToastSentRef.current = true;
      showToast(
        initialBoot.activatedStripePlan === 'pro_149'
          ? isEn
            ? 'Stripe payment confirmed! Pro Plan (€ 149,00) activated successfully.'
            : 'Pagamento Stripe confermato! Piano Pro (€ 149,00) attivato con successo.'
          : initialBoot.activatedStripePlan === 'annual_99'
            ? isEn
              ? 'Stripe payment confirmed! Annual Plan (€ 99,00/year) activated successfully.'
              : 'Pagamento Stripe confermato! Piano Annuale (€ 99,00/anno) attivato con successo.'
            : isEn
              ? 'Stripe payment confirmed! Monthly Plan (€ 16,99/month) activated successfully.'
              : 'Pagamento Stripe confermato! Piano Mensile (€ 16,99/mese) attivato con successo.',
        'success',
      );
      if (typeof window !== 'undefined' && hasPaidRedirectParam(window.location.search)) {
        const cleanUrl = stripPaidRedirectParam(window.location.href);
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, [initialBoot.activatedStripePlan, showToast, isEn]);

  useEffect(() => {
    if (
      initialBoot.paymentSuccessModal &&
      !paymentSuccessCleanedRef.current &&
      typeof window !== 'undefined'
    ) {
      paymentSuccessCleanedRef.current = true;
      if (hasPaymentSuccessParam(window.location.search)) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [initialBoot.paymentSuccessModal]);

  const anyModalOpen =
    profileMenuOpen ||
    mobileFiltersOpen ||
    clientModalOpen ||
    exportModalOpen ||
    authModalOpen ||
    plansModalOpen ||
    agencyModalOpen ||
    galleryState.isOpen ||
    paymentSuccessModalOpen ||
    confirmDialog !== null ||
    activeLegalDoc !== null;

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', anyModalOpen);
    return () => document.body.classList.remove('overflow-hidden');
  }, [anyModalOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (paymentSuccessModalOpen) {
          setPaymentSuccessModalOpen(false);
        } else if (confirmDialog) {
          setConfirmDialog(null);
        } else if (galleryState.isOpen) {
          setGalleryState((prev) => ({ ...prev, isOpen: false }));
        } else if (activeLegalDoc) {
          setActiveLegalDoc(null);
        } else if (mobileFiltersOpen) {
          setMobileFiltersOpen(false);
        } else if (profileMenuOpen) {
          setProfileMenuOpen(false);
        } else if (clientModalOpen) {
          setClientModalOpen(false);
        } else if (exportModalOpen) {
          setExportModalOpen(false);
        } else if (authModalOpen) {
          setPendingPlanAfterAuth(null);
          setAuthModalOpen(false);
        } else if (plansModalOpen) {
          setPlansModalOpen(false);
        } else if (agencyModalOpen) {
          setAgencyModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    paymentSuccessModalOpen,
    confirmDialog,
    galleryState.isOpen,
    activeLegalDoc,
    mobileFiltersOpen,
    profileMenuOpen,
    clientModalOpen,
    exportModalOpen,
    authModalOpen,
    plansModalOpen,
    agencyModalOpen,
  ]);

  useEffect(() => {
    const refreshNow = () => setNowMs(Date.now());
    const intervalId = window.setInterval(refreshNow, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshNow();
    };
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshNow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const reconciled = reconcileExpiredSubscription(currentUser, nowMs);
    if (!reconciled.downgradedFrom) return;

    const accounts = getAccounts();
    const nextAccounts = accounts.map((a) =>
      a.email === reconciled.user.email ? reconciled.user : a,
    );
    saveAccounts(nextAccounts);
    if (reconciled.downgradedFrom === 'agency') {
      clearAgencyWorkspace();
      setAgencyWorkspace(null);
    }
    setCurrentUser(reconciled.user);
    showToast(
      isEn
        ? 'Subscription expired due to missed renewal: reverted to Free plan. Risk of losing data.'
        : 'Abbonamento scaduto per mancato rinnovo: sei tornato al piano Free. Pericolo di perdere i dati.',
      'error',
    );
  }, [currentUser, nowMs, showToast, isEn]);

  const subscriptionStatus = useMemo(
    () => evaluateSubscriptionStatus(currentUser, nowMs),
    [currentUser, nowMs],
  );
  const activePlan = subscriptionStatus.plan;
  const clientLimit = getClientLimit(activePlan);
  const allowExtraChannels = canUseWhatsAppAndMap(activePlan);
  const allowAgencySync = canUseAgencySync(activePlan);

  const agencySync = useAgencySync({
    enabled: allowAgencySync,
    workspace: agencyWorkspace,
    clientsRef,
    onRemoteState: useCallback(
      ({ clients: remoteClients, isInitialJoin, agencyCode }) => {
        const normalized = remoteClients.map(normalizeClientRecord);
        clientsRef.current = normalized;
        saveStoredClients(normalized);
        setClients(normalized);
        if (!isInitialJoin) {
          showToast(
            isEn
              ? `Agency archive (${agencyCode}) updated in real time.`
              : `Archivio agenzia (${agencyCode}) aggiornato in tempo reale.`,
            'info',
          );
        }
      },
      [showToast, isEn],
    ),
    onRemoteUpsert: useCallback(
      (remoteClient, evt) => {
        const next = applyUpsertClientSync(clientsRef.current, remoteClient);
        clientsRef.current = next;
        saveStoredClients(next);
        setClients(next);
        if (evt) {
          showToast(`${evt.agentName}: ${evt.action}`, 'info');
        }
      },
      [showToast],
    ),
    onRemoteDelete: useCallback(
      (clientId, evt) => {
        const next = applyDeleteClientSync(clientsRef.current, clientId);
        clientsRef.current = next;
        saveStoredClients(next);
        setClients(next);
        if (evt) {
          showToast(`${evt.agentName}: ${evt.action}`, 'info');
        }
      },
      [showToast],
    ),
    onSyncError: useCallback(
      (msg) => {
        showToast(msg, 'error');
      },
      [showToast],
    ),
  });

  const visiblePool = useMemo(
    () => getVisibleClientsPool(clients, activePlan),
    [clients, activePlan],
  );

  const metrics = useMemo(() => computeMetrics(visiblePool), [visiblePool]);

  const favoritesCount = useMemo(
    () => visiblePool.filter((c) => Boolean(c.isFavorite)).length,
    [visiblePool],
  );

  const withPhotosCount = useMemo(
    () => visiblePool.filter((c) => getClientPhotos(c).length > 0).length,
    [visiblePool],
  );

  const availableTags = useMemo(() => getAvailableTags(visiblePool), [visiblePool]);

  const activeTagFilter =
    tagFilter === 'ALL' || availableTags.some((t) => t.toLowerCase() === tagFilter.toLowerCase())
      ? tagFilter
      : 'ALL';

  const parsedMinBudget = parseBudgetBound(minBudgetInput);
  const parsedMaxBudget = parseBudgetBound(maxBudgetInput);

  const filteredClients = useMemo(
    () =>
      filterAndSortClients(visiblePool, {
        query: searchQuery,
        status: statusFilter,
        role: roleFilter,
        tag: activeTagFilter,
        sortBy,
        favoritesOnly,
        minPrice: parsedMinBudget,
        maxPrice: parsedMaxBudget,
        withPhotosOnly,
      }),
    [
      visiblePool,
      searchQuery,
      statusFilter,
      roleFilter,
      activeTagFilter,
      sortBy,
      favoritesOnly,
      parsedMinBudget,
      parsedMaxBudget,
      withPhotosOnly,
    ],
  );

  const hasFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    roleFilter !== 'ALL' ||
    activeTagFilter !== 'ALL' ||
    sortBy !== 'default' ||
    favoritesOnly ||
    minBudgetInput.trim() !== '' ||
    maxBudgetInput.trim() !== '' ||
    withPhotosOnly;

  const persistClients = useCallback(
    (nextClients: ClientRecord[]): boolean => {
      if (!saveStoredClients(nextClients)) {
        showToast(
          isEn
            ? 'Save failed: insufficient browser storage. Remove a few photos or export a backup.'
            : 'Salvataggio non riuscito: memoria del browser insufficiente. Rimuovi qualche foto o esporta un backup.',
          'error',
        );
        return false;
      }
      clientsRef.current = nextClients;
      setClients(nextClients);
      return true;
    },
    [showToast, isEn],
  );

  const openPlansModal = useCallback((message = '', preselect: PaidPlanTier | null = null) => {
    setPlansContextMsg(message);
    setPreselectedPlan(preselect);
    setPlansModalOpen(true);
  }, []);

  const requireUpgrade = useCallback(
    (reason: string) => {
      if (!currentUser) {
        openPlansModal(
          isEn
            ? `${reason} Sign in or activate Monthly (€ 16,99/month), Annual (€ 99,00/year), or Pro Plan (€ 149,00).`
            : `${reason} Accedi o attiva Piano Mensile (€ 16,99/mese), Annuale (€ 99,00/anno) o Piano Pro (€ 149,00).`,
        );
      } else {
        openPlansModal(reason);
      }
    },
    [currentUser, openPlansModal, isEn],
  );

  const openNewClientModal = () => {
    if (clients.length >= clientLimit) {
      if (activePlan === 'free') {
        requireUpgrade(
          isEn
            ? `Limit reached: without a subscription you can manage up to ${clientLimit} clients. Sign in/Register and activate Single Pro or Agency / Team.`
            : `Limite raggiunto: senza abbonamento puoi gestire massimo ${clientLimit} clienti. Accedi/Registrati e attiva Singolo Pro o Agenzia / Team.`,
        );
      }
      return;
    }
    setEditingClient(null);
    setClientModalOpen(true);
  };

  const openEditClientModal = (id: string) => {
    const found = clients.find((c) => String(c.id) === String(id));
    if (!found) {
      showToast(isEn ? 'Client card not found.' : 'Scheda cliente non trovata.', 'error');
      return;
    }
    setEditingClient(found);
    setClientModalOpen(true);
  };

  const handleSaveClient = (clientData: ClientRecord, isEdit: boolean): boolean => {
    if (!isEdit && clients.length >= clientLimit) {
      setClientModalOpen(false);
      requireUpgrade(
        isEn
          ? `Maximum limit of ${clientLimit} clients reached for your current plan.`
          : `Limite massimo di ${clientLimit} clienti raggiunto per il tuo piano attuale.`,
      );
      return false;
    }

    const next = isEdit
      ? clients.map((c) => (String(c.id) === String(clientData.id) ? clientData : c))
      : [clientData, ...clients];

    if (!persistClients(next)) return false;
    if (allowAgencySync && agencyWorkspace) {
      agencySync.sendUpsert(clientData);
    }
    setClientModalOpen(false);
    showToast(
      isEdit
        ? isEn
          ? 'Client card updated.'
          : 'Scheda cliente aggiornata.'
        : isEn
          ? 'New client added.'
          : 'Nuovo cliente aggiunto.',
    );
    return true;
  };

  const handleToggleFavorite = (id: string) => {
    const target = clients.find((c) => String(c.id) === String(id));
    if (!target) return;
    const next = toggleClientFavorite(clients, id);
    if (persistClients(next)) {
      const updated = next.find((c) => String(c.id) === String(id));
      if (updated && allowAgencySync && agencyWorkspace) {
        agencySync.sendUpsert(updated);
      }
      showToast(
        target.isFavorite
          ? isEn
            ? `${target.name} removed from favorites.`
            : `${target.name} rimosso dai preferiti.`
          : isEn
            ? `${target.name} added to favorites.`
            : `${target.name} aggiunto ai preferiti.`,
      );
    }
  };

  const handleDownloadClientPdf = async (clientOrId: string | ClientRecord) => {
    const target =
      typeof clientOrId === 'string'
        ? clients.find((c) => String(c.id) === String(clientOrId))
        : clientOrId;
    if (!target) {
      showToast(isEn ? 'Client card not found.' : 'Scheda cliente non trovata.', 'error');
      return;
    }
    try {
      const { downloadClientPdf } = await import('./utils/clientPdf');
      const filename = downloadClientPdf(target, lang);
      showToast(
        isEn
          ? `PDF card downloaded (${filename}).`
          : `Scheda PDF scaricata (${filename}).`,
      );
    } catch {
      showToast(
        isEn
          ? 'Unable to generate PDF for this client.'
          : 'Impossibile generare il PDF per questo cliente.',
        'error',
      );
    }
  };

  const handleDeleteClient = (id: string) => {
    const found = clients.find((c) => String(c.id) === String(id));
    if (!found) {
      showToast(isEn ? 'Client not found.' : 'Cliente non trovato.', 'error');
      return;
    }
    setConfirmDialog({
      title: isEn ? 'Delete client card' : 'Elimina scheda cliente',
      message: isEn
        ? `Permanently delete ${found.name}'s card? This action cannot be undone.`
        : `Eliminare definitivamente la scheda di ${found.name}? L'operazione non è reversibile.`,
      confirmLabel: isEn ? 'Delete client' : 'Elimina cliente',
      variant: 'danger',
      onConfirm: () => {
        const next = clients.filter((c) => String(c.id) !== String(id));
        if (persistClients(next)) {
          if (allowAgencySync && agencyWorkspace) {
            agencySync.sendDelete(id);
          }
          showToast(isEn ? 'Client card deleted.' : 'Scheda cliente eliminata.');
        }
      },
    });
  };

  const handleSearchPortalsForClient = (client: ClientRecord) => {
    const { cityZone } = extractClientCityAndZone(client.zone, client.address);
    const city = cityZone || 'Milano';
    const contract: 'vendita' | 'affitto' =
      client.role === 'Inquilino' || client.role === 'Locatore' ? 'affitto' : 'vendita';
    const rooms = parseRoomsCount(client.rooms);
    const maxPrice = client.price > 0 ? String(Math.round(client.price)) : '';
    const targets = buildRadarPortalUrls({
      city,
      maxPrice,
      rooms,
      contract,
      onlyPrivate: false,
      extraQuery: client.propertyType || '',
    });

    const result = openMultiPortalWindows(targets, 'tabs');
    if (result.blockedPortals.length > 0) {
      setPortalLauncherState({
        isOpen: true,
        title: isEn
          ? `4 Portals Ready for ${client.name}`
          : `4 Portali Pronti per ${client.name}`,
        subtitle: `${city}${maxPrice ? ` · ≤ ${formatCurrencyEUR(Number(maxPrice), lang)}` : ''}`,
        portals: result.allPortals,
        blockedCount: result.blockedPortals.length,
      });
    } else {
      showToast(
        isEn
          ? `Opened all 4 portals for ${client.name}.`
          : `Aperti tutti e 4 i portali per ${client.name}.`,
        'success',
      );
    }
  };

  const handleLoad50Demo = () => {
    if (clientLimit < 50) {
      openPlansModal(
        isEn
          ? `Loading 50 demo clients requires the Monthly (€ 16,99/month), Annual (€ 99,00/year), or Pro Plan (€ 149,00). Your current plan allows up to ${clientLimit} clients.`
          : `Il caricamento di 50 clienti demo richiede il Piano Mensile (€ 16,99/mese), Annuale (€ 99,00/anno) o Piano Pro (€ 149,00). Il tuo piano attuale consente massimo ${clientLimit} clienti.`,
      );
      return;
    }

    const applyDemo = () => {
      const demo = generateDemoClients(50);
      if (persistClients(demo)) {
        if (allowAgencySync && agencyWorkspace) {
          agencySync.sendReplace(
            demo,
            isEn ? 'Loaded 50 demo clients' : 'Ha caricato 50 clienti demo',
          );
        }
        showToast(isEn ? 'Loaded 50 demo client cards.' : 'Caricate 50 schede clienti demo.');
      }
    };

    if (clients.length > 0) {
      setConfirmDialog({
        title: isEn ? 'Load 50 demo clients' : 'Carica 50 clienti demo',
        message: isEn
          ? 'Loading 50 demo clients will replace your current archive. Export a JSON backup first if you want to keep your existing data.'
          : 'Caricare i 50 clienti demo sostituirà l’archivio attuale. Esporta prima un backup JSON se desideri conservare i dati esistenti.',
        confirmLabel: isEn ? 'Load 50 demo' : 'Carica 50 demo',
        variant: 'primary',
        onConfirm: applyDemo,
      });
    } else {
      applyDemo();
    }
  };

  const handleTrimToPlanLimit = () => {
    if (!Number.isFinite(clientLimit) || clients.length <= clientLimit) return;
    setConfirmDialog({
      title: isEn
        ? `Trim archive to ${clientLimit} clients`
        : `Allinea archivio a ${clientLimit} clienti`,
      message: isEn
        ? `Keep only the first ${clientLimit} clients and delete the remaining ${
            clients.length - clientLimit
          }? Export a JSON backup first if you want to keep them.`
        : `Mantenere solo i primi ${clientLimit} clienti in archivio ed eliminare gli altri ${
            clients.length - clientLimit
          }? Esporta prima un backup JSON se vuoi conservarli.`,
      confirmLabel: isEn ? `Keep first ${clientLimit}` : `Mantieni primi ${clientLimit}`,
      variant: 'danger',
      onConfirm: () => {
        const next = clients.slice(0, clientLimit);
        if (persistClients(next)) {
          if (allowAgencySync && agencyWorkspace) {
            agencySync.sendReplace(
              next,
              isEn
                ? `Archive trimmed to ${clientLimit} clients`
                : `Allineamento archivio a ${clientLimit} clienti`,
            );
          }
          showToast(
            isEn
              ? `Archive trimmed to ${clientLimit} clients.`
              : `Archivio allineato al limite di ${clientLimit} clienti.`,
          );
        }
      },
    });
  };

  const handleCompleteReminder = (id: string) => {
    const next = clients.map((c) => (String(c.id) === String(id) ? { ...c, reminderDate: '' } : c));
    if (persistClients(next)) {
      const updated = next.find((c) => String(c.id) === String(id));
      if (updated && allowAgencySync && agencyWorkspace) {
        agencySync.sendUpsert(updated);
      }
      showToast(
        isEn
          ? 'Reminder completed and removed from agenda.'
          : 'Promemoria completato e rimosso dall’agenda.',
      );
    }
  };

  const handleSnoozeReminder = (id: string, days: number) => {
    const target = clients.find((c) => String(c.id) === String(id));
    if (!target) return;
    const current = new Date(target.reminderDate || Date.now());
    const base = Number.isNaN(current.getTime()) ? new Date() : current;
    const nextDate = new Date(Math.max(base.getTime(), Date.now()) + days * 86400000);
    const next = clients.map((c) =>
      String(c.id) === String(id) ? { ...c, reminderDate: localDateTimeValue(nextDate) } : c,
    );
    if (persistClients(next)) {
      const updated = next.find((c) => String(c.id) === String(id));
      if (updated && allowAgencySync && agencyWorkspace) {
        agencySync.sendUpsert(updated);
      }
      showToast(
        isEn
          ? `Follow-up snoozed by ${days} ${days === 1 ? 'day' : 'days'}.`
          : `Richiamo posticipato di ${days} ${days === 1 ? 'giorno' : 'giorni'}.`,
      );
    }
  };

  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) {
      showToast(
        isEn
          ? 'This browser does not support notifications.'
          : 'Questo browser non supporta le notifiche.',
        'error',
      );
      return;
    }
    if (!window.isSecureContext) {
      showToast(
        isEn
          ? 'Notifications require HTTPS or localhost.'
          : 'Le notifiche richiedono HTTPS o localhost.',
        'error',
      );
      return;
    }
    try {
      const permission =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
      if (permission === 'granted') {
        new Notification('ImmoPulse CRM', {
          body: isEn
            ? 'Notifications enabled. Reminders appear in your agenda.'
            : 'Notifiche attivate. I promemoria vengono mostrati nell’agenda.',
        });
        showToast(isEn ? 'Browser notifications enabled.' : 'Notifiche browser attivate.');
      } else if (permission === 'denied') {
        showToast(
          isEn
            ? 'Notifications blocked by browser settings.'
            : 'Notifiche bloccate dalle impostazioni del browser.',
          'error',
        );
      } else {
        showToast(
          isEn ? 'Notification permission not granted.' : 'Permesso notifiche non concesso.',
          'info',
        );
      }
    } catch {
      showToast(
        isEn ? 'Unable to enable notifications.' : 'Non è stato possibile attivare le notifiche.',
        'error',
      );
    }
  };

  const handleOpenAuth = (mode: 'login' | 'register', message = '') => {
    setAuthMode(mode);
    setAuthContextMsg(message);
    setAuthModalOpen(true);
  };

  const handleLogin = (email: string, password: string): string | null => {
    const accounts = getAccounts();
    const idx = accounts.findIndex((a) => a.email === email && a.password === password);
    if (idx === -1) {
      return isEn
        ? 'Invalid credentials. Check your email and password or register.'
        : 'Credenziali non valide. Controlla email e password oppure registrati.';
    }
    const reconciled = reconcileExpiredSubscription(accounts[idx], Date.now());
    if (reconciled.downgradedFrom) {
      const nextAccounts = accounts.map((a, i) => (i === idx ? reconciled.user : a));
      saveAccounts(nextAccounts);
      if (reconciled.downgradedFrom === 'agency') {
        clearAgencyWorkspace();
        setAgencyWorkspace(null);
      }
    }
    setCurrentUser(reconciled.user);
    setExpiringBannerDismissed(false);
    saveSessionEmail(reconciled.user.email);
    setAuthModalOpen(false);
    if (reconciled.downgradedFrom) {
      showToast(
        isEn
          ? 'Subscription expired due to missed renewal: account reverted to Free plan. Risk of data loss.'
          : 'Abbonamento scaduto per mancato rinnovo: account riportato al piano Free. Rischio perdita dati.',
        'error',
      );
    } else {
      showToast(isEn ? `Welcome back, ${reconciled.user.name}!` : `Bentornato, ${reconciled.user.name}!`);
    }
    if (pendingPlanAfterAuth) {
      const plan = pendingPlanAfterAuth;
      setPendingPlanAfterAuth(null);
      openPlansModal('', plan);
    }
    return null;
  };

  const handleRegister = (name: string, email: string, password: string): string | null => {
    const accounts = getAccounts();
    if (accounts.some((a) => a.email === email)) {
      return isEn
        ? 'An account with this email already exists. Please sign in.'
        : 'Esiste già un account con questa email. Effettua l’accesso.';
    }
    const newUser: UserAccount = {
      name,
      email,
      password,
      plan: 'free',
      paymentMethod: '',
      activatedAt: '',
    };
    const nextAccounts = [...accounts, newUser];
    if (!saveAccounts(nextAccounts)) {
      return isEn
        ? 'Unable to save account data in the browser (storage full).'
        : 'Impossibile salvare i dati dell’account nel browser (spazio esaurito).';
    }
    setCurrentUser(newUser);
    saveSessionEmail(newUser.email);
    setAuthModalOpen(false);
    showToast(isEn ? 'Registration completed!' : 'Registrazione completata!');
    const nextPlan = pendingPlanAfterAuth;
    setPendingPlanAfterAuth(null);
    openPlansModal(
      isEn
        ? 'Account created! Choose Monthly (€ 16,99/month), Annual (€ 99,00/year), or Pro Plan (€ 149,00).'
        : 'Account creato! Scegli Piano Mensile (€ 16,99/mese), Annuale (€ 99,00/anno) o Piano Pro (€ 149,00).',
      nextPlan,
    );
    return null;
  };

  const handleLogout = () => {
    setConfirmDialog({
      title: isEn ? 'Sign out' : 'Disconnetti account',
      message: isEn
        ? 'Do you want to sign out? You will return to Guest Mode (up to 3 active clients, Call & Email only).'
        : 'Vuoi disconnetterti? Tornerai alla modalità Ospite (massimo 3 clienti attivi, solo Chiama ed Email).',
      confirmLabel: isEn ? 'Sign out' : 'Disconnetti',
      variant: 'primary',
      onConfirm: () => {
        setCurrentUser(null);
        clearSessionEmail();
        clearLicenseCode();
        clearProActiveFlag();
        setSavedLicenseCode(null);
        setAgencyWorkspace(null);
        clearAgencyWorkspace();
        showToast(isEn ? 'Signed out successfully.' : 'Disconnessione effettuata.');
      },
    });
  };

  const handleVerifyLicenseCode = useCallback(
    (rawCode: string): { ok: boolean; message: string } => {
      const accounts = getAccounts();
      const result = applyLicenseCodeActivation(
        accounts,
        currentUser?.email ?? loadSessionEmail(),
        rawCode,
        Date.now(),
        lang,
      );
      if (!result.ok) {
        return { ok: false, message: result.error };
      }

      if (!saveAccounts(result.accounts) || !saveLicenseCode(result.normalizedCode)) {
        return {
          ok: false,
          message: isEn
            ? 'Unable to save the license locally (browser storage full).'
            : 'Impossibile salvare la licenza localmente (memoria browser esaurita).',
        };
      }

      saveProActiveFlag(result.activatedUser.activatedAt);
      saveSessionEmail(result.sessionEmail);
      setSavedLicenseCode(result.normalizedCode);
      setCurrentUser(result.activatedUser);
      setExpiringBannerDismissed(false);

      const unlockedLabel =
        result.plan === 'agency'
          ? isEn
            ? 'ImmoPulse Agency Pro License'
            : 'Licenza Agenzia ImmoPulse Pro'
          : isEn
            ? 'ImmoPulse Agent Pro License'
            : 'Licenza Agente ImmoPulse Pro';

      const okMsg = isEn
        ? `License ${result.normalizedCode} verified! ${unlockedLabel} unlocked locally.`
        : `Licenza ${result.normalizedCode} verificata! ${unlockedLabel} sbloccata localmente.`;

      showToast(okMsg, 'success');
      return { ok: true, message: okMsg };
    },
    [currentUser, lang, isEn, showToast],
  );

  const handleConfirmPlanPayment = (
    plan: PaidPlanTier,
    paymentLabel: string,
    billingCycle: BillingCycle,
  ) => {
    if (!currentUser) return;
    const accounts = getAccounts();
    const idx = accounts.findIndex((a) => a.email === currentUser.email);
    if (idx === -1) return;

    const now = Date.now();
    const resolvedCycle = resolveBillingCycle(plan, billingCycle);
    const baseExpiry = accounts[idx].plan === plan ? accounts[idx].expiresAt : undefined;
    const nextExpiresAt = computeSubscriptionExpiry(now, plan, resolvedCycle, baseExpiry);

    const updatedUser: UserAccount = {
      ...accounts[idx],
      plan,
      billingCycle: resolvedCycle,
      paymentMethod: paymentLabel,
      activatedAt: new Date(now).toISOString(),
      expiresAt: nextExpiresAt,
      expiredFromPlan: undefined,
      expiredAt: undefined,
    };
    const nextAccounts = accounts.map((a, i) => (i === idx ? updatedUser : a));
    if (!saveAccounts(nextAccounts)) {
      showToast(
        isEn
          ? 'Unable to save the plan update in the browser.'
          : 'Impossibile salvare l’aggiornamento del piano nel browser.',
        'error',
      );
      return;
    }
    setCurrentUser(updatedUser);
    setExpiringBannerDismissed(false);
    setPlansModalOpen(false);
    const planLabel = getSubscriptionPlanLabel(plan, resolvedCycle, lang);
    showToast(
      isEn
        ? `${planLabel} plan activated with ${paymentLabel}!`
        : `Piano ${planLabel} attivato con ${paymentLabel}!`,
    );
    if (plan === 'agency') {
      setAgencyModalOpen(true);
    }
  };

  const handleDismissExpiredBanner = () => {
    if (!currentUser) return;
    const updatedUser: UserAccount = {
      ...currentUser,
      expiredFromPlan: undefined,
      expiredAt: undefined,
    };
    const accounts = getAccounts();
    const nextAccounts = accounts.map((a) =>
      a.email === currentUser.email ? updatedUser : a,
    );
    saveAccounts(nextAccounts);
    setCurrentUser(updatedUser);
  };

  const handleConnectAgencyWorkspace = (config: AgencyWorkspaceConfig) => {
    saveAgencyWorkspace(config);
    setAgencyWorkspace(config);
    if (currentUser) {
      const accounts = getAccounts();
      const updatedUser: UserAccount = {
        ...currentUser,
        agencyCode: config.agencyCode,
        agencyName: config.agencyName,
      };
      const nextAccounts = accounts.map((a) => (a.email === currentUser.email ? updatedUser : a));
      saveAccounts(nextAccounts);
      setCurrentUser(updatedUser);
    }
    showToast(
      isEn
        ? `Device connected to agency room "${config.agencyCode}".`
        : `Dispositivo collegato alla stanza agenzia "${config.agencyCode}".`,
    );
  };

  const handleDisconnectAgencyWorkspace = () => {
    clearAgencyWorkspace();
    setAgencyWorkspace(null);
    showToast(
      isEn
        ? 'Device disconnected from live team sync.'
        : 'Dispositivo scollegato dal team in tempo reale.',
      'info',
    );
  };

  const handleExportCsv = () => {
    if (visiblePool.length === 0) {
      showToast(isEn ? 'No data to export.' : 'Nessun dato da esportare.', 'error');
      return;
    }
    const csv = generateCsvContent(visiblePool, lang);
    downloadBlob(
      csv,
      `${isEn ? 'Clients' : 'Clienti'}_ImmoPulse_${localDateTimeValue().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8',
    );
    showToast(isEn ? 'CSV export completed.' : 'Esportazione CSV completata.');
  };

  const handleExportJson = () => {
    downloadBlob(
      JSON.stringify(clients, null, 2),
      `Backup_ImmoPulse_${localDateTimeValue().slice(0, 10)}.json`,
      'application/json;charset=utf-8',
    );
    showToast(isEn ? 'JSON backup downloaded.' : 'Backup JSON scaricato.');
  };

  const handleImportJson = (imported: ClientRecord[]) => {
    setConfirmDialog({
      title: isEn ? 'Restore JSON backup' : 'Ripristina backup JSON',
      message: isEn
        ? `The backup contains ${imported.length} cards. Replace your current archive?`
        : `Il backup contiene ${imported.length} schede. Sostituire l’archivio attuale?`,
      confirmLabel: isEn ? 'Restore backup' : 'Ripristina backup',
      variant: 'primary',
      onConfirm: () => {
        if (persistClients(imported)) {
          if (allowAgencySync && agencyWorkspace) {
            agencySync.sendReplace(
              imported,
              isEn
                ? `Restored a backup (${imported.length} cards)`
                : `Ha ripristinato un backup (${imported.length} schede)`,
            );
          }
          setExportModalOpen(false);
          showToast(isEn ? 'Backup restored successfully.' : 'Backup ripristinato con successo.');
        }
      },
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setRoleFilter('ALL');
    setTagFilter('ALL');
    setSortBy('default');
    setFavoritesOnly(false);
    setMinBudgetInput('');
    setMaxBudgetInput('');
    setWithPhotosOnly(false);
  };

  const formattedExpiryDate = subscriptionStatus.expiresAt
    ? new Date(subscriptionStatus.expiresAt).toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  const planSummaryText =
    activePlan === 'agency'
      ? isEn
        ? `Agency / Team Plan (€149/year · Unlimited)${formattedExpiryDate ? ` · Expires ${formattedExpiryDate}` : ''}`
        : `Piano Agenzia / Team (€149/anno · Illimitato)${formattedExpiryDate ? ` · Scade il ${formattedExpiryDate}` : ''}`
      : activePlan === 'pro'
        ? isEn
          ? `${getSubscriptionPlanLabel('pro', subscriptionStatus.billingCycle, lang)} Plan Unlimited${formattedExpiryDate ? ` · Expires ${formattedExpiryDate}` : ''}`
          : `Piano ${getSubscriptionPlanLabel('pro', subscriptionStatus.billingCycle, lang)} Illimitato${formattedExpiryDate ? ` · Scade il ${formattedExpiryDate}` : ''}`
        : currentUser
          ? isEn
            ? 'Free Plan (Max 3 clients)'
            : 'Piano Free (Max 3 clienti)'
          : isEn
            ? 'Guest Mode (Max 3 clients)'
            : 'Modalità Ospite (Max 3 clienti)';

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'ALL') count += 1;
    if (roleFilter !== 'ALL') count += 1;
    if (tagFilter !== 'ALL') count += 1;
    if (sortBy !== 'default') count += 1;
    if (favoritesOnly) count += 1;
    if (withPhotosOnly) count += 1;
    if (minBudgetInput.trim()) count += 1;
    if (maxBudgetInput.trim()) count += 1;
    return count;
  }, [
    statusFilter,
    roleFilter,
    tagFilter,
    sortBy,
    favoritesOnly,
    withPhotosOnly,
    minBudgetInput,
    maxBudgetInput,
  ]);

  const activeClientsUsed = Math.min(clients.length, Number.isFinite(clientLimit) ? clientLimit : clients.length);

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f8f8] text-[#0f3b47] pb-24 md:pb-6">
      {/* CLEAN HEADER: Mobile = Logo + IT/EN + Notifications + Menu/Profile | Desktop = Full Nav */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#cbe2de] px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
          {/* Zone 1: Brand Wordmark + Desktop PRO Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('all');
              }}
              className="flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#0e4d5f] rounded-lg"
            >
              <BrandLogo className="w-7 h-7 shrink-0" />
              <span className="font-display font-bold text-base sm:text-lg tracking-tight text-[#0e4d5f]">
                Immo<span className="text-[#2eb086]">Pulse</span>
              </span>
            </a>
            {activePlan !== 'free' && (
              <span
                data-testid="header-pro-badge"
                className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#e6f7f1] text-[#177858] border border-[#2eb086]/40 text-[11px] font-bold tracking-wide whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>{isEn ? 'PRO ACTIVE' : 'PRO ATTIVO'}</span>
              </span>
            )}
          </div>

          {/* Zone 2: Desktop Navigation Links */}
          <nav
            aria-label={isEn ? 'Main navigation' : 'Navigazione principale'}
            className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-[#4a707a]"
          >
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-[#0e4d5f] text-[#0e4d5f] font-semibold'
                  : 'border-transparent hover:text-[#0e4d5f]'
              }`}
            >
              {isEn ? 'Clients' : 'Clienti'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-[#0e4d5f] text-[#0e4d5f] font-semibold'
                  : 'border-transparent hover:text-[#0e4d5f]'
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reminders')}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'reminders'
                  ? 'border-[#0e4d5f] text-[#0e4d5f] font-semibold'
                  : 'border-transparent hover:text-[#0e4d5f]'
              }`}
            >
              <span>{isEn ? 'Follow-ups' : 'Richiami'}</span>
              {metrics.remindersDue > 0 && (
                <span className="font-mono tabular-nums text-xs font-bold text-rose-700">
                  ({metrics.remindersDue})
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('matching')}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                activeTab === 'matching'
                  ? 'border-[#0e4d5f] text-[#0e4d5f] font-semibold'
                  : 'border-transparent hover:text-[#0e4d5f]'
              }`}
            >
              Matching
            </button>
            <button
              type="button"
              data-testid="nav-tab-find"
              onClick={() => setActiveTab('find')}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                activeTab === 'find'
                  ? 'border-[#0e4d5f] text-[#0e4d5f] font-semibold'
                  : 'border-transparent hover:text-[#0e4d5f]'
              }`}
            >
              {isEn ? 'Find Property' : 'Cerca Immobile'}
            </button>
            <button
              type="button"
              data-testid="nav-tab-plans"
              onClick={() => openPlansModal()}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors inline-flex items-center gap-1 ${
                plansModalOpen
                  ? 'border-[#0e4d5f] text-[#0e4d5f] font-semibold'
                  : 'border-transparent hover:text-[#0e4d5f]'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              <span>{isEn ? 'Subscriptions' : 'Abbonamenti'}</span>
            </button>
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="py-1 whitespace-nowrap shrink-0 border-b-2 border-transparent hover:text-rose-700 transition-colors"
              >
                {isEn ? `Sign Out (${currentUser.name})` : `Esci (${currentUser.name})`}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenAuth('login')}
                className="py-1 whitespace-nowrap shrink-0 border-b-2 border-transparent hover:text-[#0e4d5f] transition-colors"
              >
                {isEn ? 'Sign In' : 'Accedi'}
              </button>
            )}
          </nav>

          {/* Zone 3: Language Switcher (IT | EN) + Bell Notifications + Profile/Menu Icon (+ Desktop CTA) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              data-testid="language-switcher"
              role="group"
              aria-label={isEn ? 'Language selector' : 'Selettore lingua'}
              className="inline-flex items-center rounded-lg border border-[#cbe2de] bg-[#f4faf9] p-0.5"
            >
              <button
                type="button"
                data-testid="lang-btn-it"
                aria-pressed={lang === 'it'}
                onClick={() => setLang('it')}
                className={`px-2 py-1 rounded-md text-[11px] sm:text-xs font-bold transition-colors ${
                  lang === 'it'
                    ? 'bg-[#0e4d5f] text-white shadow-2xs'
                    : 'text-[#4a707a] hover:text-[#0e4d5f]'
                }`}
              >
                IT
              </button>
              <button
                type="button"
                data-testid="lang-btn-en"
                aria-pressed={lang === 'en'}
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded-md text-[11px] sm:text-xs font-bold transition-colors ${
                  lang === 'en'
                    ? 'bg-[#0e4d5f] text-white shadow-2xs'
                    : 'text-[#4a707a] hover:text-[#0e4d5f]'
                }`}
              >
                EN
              </button>
            </div>

            {/* Notifications Bell Icon */}
            <button
              type="button"
              data-testid="header-notifications-btn"
              onClick={() => {
                setActiveTab('reminders');
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                  void handleRequestNotifications();
                }
              }}
              aria-label={isEn ? 'Reminders and notifications' : 'Notifiche e richiami'}
              title={isEn ? 'Reminders & Notifications' : 'Notifiche e Richiami'}
              className={`relative p-2 rounded-lg border transition-colors ${
                activeTab === 'reminders'
                  ? 'bg-[#e6f7f1] border-[#2eb086] text-[#0e4d5f]'
                  : 'bg-[#f4faf9] border-[#cbe2de] text-[#0e4d5f] hover:bg-[#e6f3f1]'
              }`}
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" aria-hidden="true" />
              {metrics.remindersDue > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold font-mono flex items-center justify-center leading-none">
                  {metrics.remindersDue > 9 ? '9+' : metrics.remindersDue}
                </span>
              )}
            </button>

            {/* Menu / Profile Icon (opens clean bottom-sheet drawer) */}
            <button
              type="button"
              data-testid="header-profile-menu-btn"
              onClick={() => setProfileMenuOpen(true)}
              aria-label={isEn ? 'Open profile and tools menu' : 'Apri menu profilo e strumenti'}
              title={isEn ? 'Profile & Tools Menu' : 'Menu Profilo e Strumenti'}
              className="relative p-2 rounded-lg border border-[#cbe2de] bg-[#f4faf9] hover:bg-[#e6f3f1] text-[#0e4d5f] transition-colors md:hidden"
            >
              <Menu className="w-4.5 h-4.5" aria-hidden="true" />
              {(currentUser || activePlan !== 'free') && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#2eb086] ring-2 ring-white" />
              )}
            </button>

            {/* Desktop only + New Client button (mobile uses centered bottom nav CTA) */}
            <button
              type="button"
              onClick={openNewClientModal}
              className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white font-semibold text-sm transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{isEn ? 'New Client' : 'Nuovo Cliente'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <main id="top" className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* Desktop-Only Compact Utility Toolbar (mobile uses Profile/Menu sheet) */}
        <section
          aria-label={isEn ? 'Workspace tools' : 'Strumenti area di lavoro'}
          className="hidden md:flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#dbeae7]"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#4a707a]">
            <span className="font-semibold text-[#0e4d5f]">{planSummaryText}</span>
            <span aria-hidden="true">·</span>
            {allowAgencySync && agencySync.isConnected ? (
              <button
                type="button"
                onClick={() => setAgencyModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-[#177858] font-semibold hover:underline"
              >
                <span className="w-2 h-2 rounded-full bg-[#2eb086]" aria-hidden="true" />
                {isEn
                  ? `Team ${agencySync.activeAgencyCode} (${agencySync.members.length} devices online)`
                  : `Team ${agencySync.activeAgencyCode} (${agencySync.members.length} dispositivi online)`}
              </button>
            ) : (
              <span>{isEn ? 'Real Estate Agenda' : 'Agenda Immobiliare'}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PWAInstallButton />
            {allowAgencySync && (
              <button
                type="button"
                data-testid="agency-sync-btn"
                onClick={() => setAgencyModalOpen(true)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  agencySync.isConnected
                    ? 'bg-[#e6f7f1] hover:bg-[#d4f2e7] text-[#177858] border-[#2eb086]/50'
                    : 'bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white border-[#0e4d5f]'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {agencySync.isConnected
                    ? isEn
                      ? `Live Team (${agencySync.members.length})`
                      : `Team Live (${agencySync.members.length})`
                    : agencySync.status === 'connecting'
                      ? isEn
                        ? 'Connecting Team...'
                        : 'Connessione Team...'
                      : isEn
                        ? 'Connect Live Team'
                        : 'Collega Team Live'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLoad50Demo}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5 text-[#2eb086]" aria-hidden="true" /> +50 Demo
            </button>
            <button
              type="button"
              onClick={handleRequestNotifications}
              aria-label={isEn ? 'Enable reminder notifications' : 'Attiva notifiche promemoria'}
              title={isEn ? 'Enable reminder notifications' : 'Attiva notifiche promemoria'}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isEn ? 'Alerts' : 'Notifiche'}</span>
            </button>
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              aria-label={
                isEn ? 'Open data backup and export' : 'Apri backup ed esportazione dati'
              }
              title={isEn ? 'Data backup & export' : 'Backup ed esportazione dati'}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Backup</span>
            </button>
          </div>
        </section>

        {/* SINGLE UNIFIED SLIM SUBSCRIPTION BAR */}
        {activePlan === 'free' && subscriptionStatus.phase !== 'expired' && (
          <section
            data-testid="unified-plan-bar"
            aria-label={isEn ? 'Plan status and upgrade' : 'Stato piano e passaggio a Pro'}
            className="bg-white border border-[#cbe2de] rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 shadow-2xs"
          >
            <button
              type="button"
              data-testid="upgrade-to-pro-btn"
              onClick={() => openPlansModal()}
              className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left group"
            >
              <div className="flex items-center gap-2 min-w-0 text-xs text-[#0e4d5f]">
                <Lock className="w-3.5 h-3.5 text-[#177858] shrink-0" aria-hidden="true" />
                <span className="truncate font-medium">
                  {currentUser
                    ? isEn
                      ? `Free Plan ${activeClientsUsed}/${clientLimit} clients`
                      : `Piano Free ${activeClientsUsed}/${clientLimit} clienti`
                    : isEn
                      ? `Guest Mode ${activeClientsUsed}/${clientLimit} clients`
                      : `Modalità Ospite ${activeClientsUsed}/${clientLimit} clienti`}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#177858] group-hover:bg-[#0e4d5f] text-white text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors">
                <Crown className="w-3 h-3 text-amber-300" aria-hidden="true" />
                <span>{isEn ? 'Upgrade to Pro' : 'Passa a Pro'}</span>
              </span>
            </button>
            {clients.length > clientLimit && (
              <button
                type="button"
                onClick={handleTrimToPlanLimit}
                className="px-2 py-1 rounded-lg bg-[#eef6f5] hover:bg-[#dceceb] text-[#0e4d5f] border border-[#cbe2de] text-[11px] font-semibold whitespace-nowrap shrink-0"
              >
                {isEn ? `Keep ${clientLimit}` : `Tieni ${clientLimit}`}
              </button>
            )}
          </section>
        )}

        {/* Stripe Checkout Return (?pagato=mensile / ?pagato=true / ?pagato=annuale / ?pagato=pro) Confirmation Banner */}
        {stripePaidPlan && (
          <section
            role="status"
            data-testid="stripe-payment-success-banner"
            aria-label={
              isEn ? 'Subscription activation confirmation' : 'Conferma attivazione abbonamento'
            }
            className="bg-[#eefaf6] border border-[#2eb086] rounded-xl px-4 py-3 flex items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-start sm:items-center gap-2.5 text-xs text-[#0e4d5f]">
              <CheckCircle2 className="w-4 h-4 text-[#177858] shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              <p>
                {stripePaidPlan === 'pro_149' ? (
                  isEn ? (
                    <>
                      <strong>Stripe payment completed!</strong> Your{' '}
                      <strong>Pro Plan (€ 149,00)</strong> has been activated automatically:
                      unlimited clients &amp; photos, WhatsApp, Maps, AI Assistant, and multi-device
                      sync are ready right away.
                    </>
                  ) : (
                    <>
                      <strong>Pagamento completato con Stripe!</strong> Il tuo{' '}
                      <strong>Piano Pro (€ 149,00)</strong> è stato attivato automaticamente: clienti e
                      foto illimitate, WhatsApp, Maps, Assistente AI e sync multi-dispositivo sono subito
                      disponibili.
                    </>
                  )
                ) : stripePaidPlan === 'annual_99' ? (
                  isEn ? (
                    <>
                      <strong>Stripe payment completed!</strong> Your{' '}
                      <strong>Annual Plan (€ 99,00/year)</strong> has been activated automatically:
                      unlimited clients, WhatsApp, Maps, PDF Export, +50 Demo, and Backup are now
                      unlocked for 12 months.
                    </>
                  ) : (
                    <>
                      <strong>Pagamento completato con Stripe!</strong> Il tuo{' '}
                      <strong>Piano Annuale (€ 99,00/anno)</strong> è stato attivato automaticamente:
                      clienti illimitati, WhatsApp, Maps, Export PDF, +50 Demo e Backup sono subito
                      disponibili per 12 mesi.
                    </>
                  )
                ) : isEn ? (
                  <>
                    <strong>Stripe payment completed!</strong> Your{' '}
                    <strong>Monthly Plan (€ 16,99/month)</strong> has been activated automatically:
                    unlimited clients, WhatsApp, Maps, PDF Export, +50 Demo, and Backup are ready.
                  </>
                ) : (
                  <>
                    <strong>Pagamento completato con Stripe!</strong> Il tuo{' '}
                    <strong>Piano Mensile (€ 16,99/mese)</strong> è stato attivato automaticamente:
                    clienti illimitati, WhatsApp, Maps, Export PDF, +50 Demo e Backup sono subito
                    disponibili.
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              data-testid="dismiss-stripe-paid-banner"
              onClick={() => setStripePaidPlan(null)}
              aria-label={isEn ? 'Dismiss payment confirmation' : 'Chiudi avviso conferma pagamento'}
              className="p-1 rounded-lg text-[#177858] hover:text-[#0e4d5f] hover:bg-[#d8f3ea] shrink-0 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </section>
        )}

        {/* Discrete Pre-Expiry Warning Banner (5 days before expiration) */}
        {subscriptionStatus.phase === 'expiring_soon' && !expiringBannerDismissed && (
          <section
            data-testid="subscription-expiring-banner"
            aria-label={isEn ? 'Subscription expiration reminder' : 'Promemoria scadenza abbonamento'}
            className="bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
          >
            <div className="flex items-start sm:items-center gap-2.5 text-xs text-amber-900">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              <p>
                {isEn ? (
                  <>
                    <strong>Renewal reminder:</strong> your{' '}
                    <strong>
                      {subscriptionStatus.plan === 'agency' || subscriptionStatus.plan === 'pro'
                        ? getSubscriptionPlanLabel(
                            subscriptionStatus.plan,
                            subscriptionStatus.billingCycle,
                            lang,
                          )
                        : ''}
                    </strong>{' '}
                    plan expires{' '}
                    <strong>
                      {subscriptionStatus.daysRemaining === 1
                        ? 'tomorrow (last day)'
                        : `in ${subscriptionStatus.daysRemaining} days`}
                    </strong>
                    {formattedExpiryDate ? ` (${formattedExpiryDate})` : ''}. Renew in advance to
                    avoid downgrading to the Free plan.
                  </>
                ) : (
                  <>
                    <strong>Promemoria rinnovo:</strong> il tuo piano{' '}
                    <strong>
                      {subscriptionStatus.plan === 'agency' || subscriptionStatus.plan === 'pro'
                        ? getSubscriptionPlanLabel(
                            subscriptionStatus.plan,
                            subscriptionStatus.billingCycle,
                            lang,
                          )
                        : ''}
                    </strong>{' '}
                    scade{' '}
                    <strong>
                      {subscriptionStatus.daysRemaining === 1
                        ? 'domani (ultimo giorno)'
                        : `tra ${subscriptionStatus.daysRemaining} giorni`}
                    </strong>
                    {formattedExpiryDate ? ` (${formattedExpiryDate})` : ''}. Rinnova in anticipo per
                    evitare il passaggio al piano Free.
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                data-testid="renew-expiring-btn"
                onClick={() =>
                  openPlansModal(
                    isEn
                      ? `Your subscription is expiring${
                          formattedExpiryDate ? ` on ${formattedExpiryDate}` : ''
                        }. Renew now to keep unlimited clients, WhatsApp, Maps, and sync without interruption.`
                      : `Il tuo abbonamento è in scadenza${
                          formattedExpiryDate ? ` il ${formattedExpiryDate}` : ''
                        }. Rinnova ora per mantenere clienti illimitati, WhatsApp, Maps e sync senza interruzioni.`,
                    subscriptionStatus.plan === 'agency' ? 'agency' : 'pro',
                  )
                }
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold whitespace-nowrap transition-colors"
              >
                {isEn ? 'Renew now' : 'Rinnova ora'}
              </button>
              <button
                type="button"
                data-testid="dismiss-expiring-banner"
                onClick={() => setExpiringBannerDismissed(true)}
                aria-label={isEn ? 'Hide expiration notice' : 'Nascondi avviso scadenza'}
                className="p-1 rounded-lg text-amber-700 hover:text-amber-950 hover:bg-amber-100/80 transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {/* Missed Renewal Downgrade & Data-Loss Warning Banner */}
        {subscriptionStatus.phase === 'expired' && (
          <section
            role="alert"
            data-testid="subscription-expired-banner"
            aria-label={
              isEn
                ? 'Expired subscription and data loss risk'
                : 'Abbonamento scaduto e pericolo perdita dati'
            }
            className="bg-rose-50 border border-rose-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3 text-xs text-rose-950">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-bold text-rose-900 text-sm">
                  {isEn
                    ? 'Subscription expired due to missed renewal — reverted to Free plan'
                    : 'Abbonamento scaduto per mancato rinnovo — sei tornato al piano Free'}
                </p>
                <p className="text-rose-800 leading-relaxed">
                  {isEn ? (
                    <>
                      <strong>Risk of losing data:</strong> on the Free plan you can manage{' '}
                      <strong>up to {clientLimit} active clients</strong> without WhatsApp, Maps, or
                      agency sync.{' '}
                      {clients.length > clientLimit
                        ? `You have ${clients.length} saved cards on this device: ${
                            clients.length - clientLimit
                          } clients are locked and could be lost if you trim the archive or clear browser cache.`
                        : 'Without an active renewal or an exported JSON backup you risk losing your saved contacts.'}
                    </>
                  ) : (
                    <>
                      <strong>Pericolo di perdere i dati:</strong> con il piano Free puoi gestire{' '}
                      <strong>massimo {clientLimit} clienti attivi</strong> senza WhatsApp, Maps o sync
                      agenzia.{' '}
                      {clients.length > clientLimit
                        ? `Hai ${clients.length} schede salvate nel dispositivo: ${
                            clients.length - clientLimit
                          } clienti sono bloccati e potrebbero andare persi se allinei l’archivio o svuoti la cache.`
                        : 'Senza un rinnovo attivo o un backup JSON esportato rischi di perdere i contatti salvati.'}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="expired-backup-btn"
                onClick={() => setExportModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold whitespace-nowrap"
              >
                {isEn ? 'Export Backup' : 'Esporta Backup'}
              </button>
              <button
                type="button"
                data-testid="expired-renew-btn"
                onClick={() =>
                  openPlansModal(
                    isEn
                      ? 'Your previous subscription expired and reverted to the Free plan. Renew now to unlock all cards immediately and safeguard your data.'
                      : 'Il tuo abbonamento precedente è scaduto ed è tornato al piano Free. Rinnova ora per sbloccare subito tutte le schede e mettere al sicuro i tuoi dati.',
                    subscriptionStatus.expiredFromPlan ?? null,
                  )
                }
                className="px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold whitespace-nowrap"
              >
                {isEn ? 'Renew Subscription' : 'Rinnova Abbonamento'}
              </button>
              <button
                type="button"
                data-testid="dismiss-expired-banner"
                onClick={handleDismissExpiredBanner}
                className="px-2.5 py-1.5 rounded-lg text-rose-800 hover:bg-rose-100 text-xs font-semibold whitespace-nowrap"
              >
                {isEn ? 'Got it' : 'Ho capito'}
              </button>
            </div>
          </section>
        )}

        {/* Agency setup reminder when Agenzia / Team plan is active but room is not yet linked */}
        {allowAgencySync && !agencyWorkspace && (
          <section
            aria-label={isEn ? 'Configure agency sync' : 'Configura sincronizzazione agenzia'}
            className="bg-white border border-[#2eb086]/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-start sm:items-center gap-3 text-xs text-[#25454e]">
              <Building2 className="w-4 h-4 text-[#0e4d5f] shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              <p>
                {isEn ? (
                  <>
                    <strong>Agency / Team Plan active (€ 149,00/year):</strong> create or enter the{' '}
                    <strong>Agency Code</strong> to link all devices and agents in your office in
                    real time.
                  </>
                ) : (
                  <>
                    <strong>Piano Agenzia / Team attivo (€ 149,00/anno):</strong> crea o inserisci il{' '}
                    <strong>Codice Agenzia</strong> per collegare in tempo reale tutti i dispositivi e
                    gli agenti del tuo ufficio.
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAgencyModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              {isEn ? 'Connect Devices Now' : 'Collega Dispositivi Ora'}
            </button>
          </section>
        )}



        {/* Metrics KPI Strip (kept above secondary tabs on desktop, focused on Clients/Dashboard on mobile) */}
        <div className={activeTab !== 'all' && activeTab !== 'dashboard' ? 'hidden md:block' : ''}>
          <MetricsStrip
            metrics={metrics}
            plan={activePlan}
            limit={clientLimit}
            onOpenReminders={() => setActiveTab('reminders')}
          />
        </div>

        {/* Filter & Search Bar for Clients View */}
        {activeTab === 'all' && (
          <section
            aria-label={isEn ? 'Search and filter clients' : 'Ricerca e filtri clienti'}
            className="space-y-2.5 animate-view-enter"
          >
            {/* Mobile Search + Bottom-Sheet Filter Trigger */}
            <div className="md:hidden space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    className="w-4 h-4 absolute left-3 top-2.5 text-[#5a808a]"
                    aria-hidden="true"
                  />
                  <label htmlFor="search-input-mobile" className="sr-only">
                    {isEn
                      ? 'Search client, phone, area, address, or tag'
                      : 'Cerca cliente, telefono, zona, indirizzo o etichetta'}
                  </label>
                  <input
                    id="search-input-mobile"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isEn ? 'Search client, area, tag...' : 'Cerca cliente, zona, etichetta...'
                    }
                    className="w-full bg-white border border-[#cbe2de] rounded-xl pl-9 pr-3 py-2 text-sm text-[#0f3b47] placeholder-[#6c8f98] focus:outline-none focus:border-[#2eb086]"
                  />
                </div>
                <button
                  type="button"
                  data-testid="mobile-filters-btn"
                  onClick={() => setMobileFiltersOpen(true)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                    activeFiltersCount > 0
                      ? 'bg-[#e6f7f1] border-[#2eb086] text-[#177858]'
                      : 'bg-white border-[#cbe2de] text-[#0e4d5f]'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                  <span>{isEn ? 'Filters' : 'Filtri'}</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#177858] text-white text-[10px] font-mono leading-none">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-[#4a707a] px-0.5">
                <span className="tabular-nums">
                  {filteredClients.length === visiblePool.length
                    ? isEn
                      ? `${visiblePool.length} active clients`
                      : `${visiblePool.length} clienti attivi`
                    : isEn
                      ? `${filteredClients.length} of ${visiblePool.length} clients`
                      : `${filteredClients.length} di ${visiblePool.length} clienti`}
                </span>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[#0e4d5f] hover:text-[#177858] font-semibold underline"
                  >
                    {isEn ? 'Reset' : 'Azzera'}
                  </button>
                )}
              </div>
            </div>

            <div className="hidden md:block space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <div className="relative sm:col-span-2">
                  <Search
                    className="w-4 h-4 absolute left-3 top-2.5 text-[#5a808a]"
                    aria-hidden="true"
                  />
                  <label htmlFor="search-input" className="sr-only">
                    {isEn
                      ? 'Search client, phone, area, address, or tag'
                      : 'Cerca cliente, telefono, zona, indirizzo o etichetta'}
                  </label>
                  <input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isEn ? 'Search client, area, tag...' : 'Cerca cliente, zona, etichetta...'
                    }
                    className="w-full bg-white border border-[#cbe2de] rounded-lg pl-9 pr-4 py-2 text-sm text-[#0f3b47] placeholder-[#6c8f98] focus:outline-none focus:border-[#2eb086]"
                  />
                </div>

                <div>
                  <label htmlFor="filter-status" className="sr-only">
                    {isEn ? 'Filter by status' : 'Filtra per esito'}
                  </label>
                  <select
                    id="filter-status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-sm text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                  >
                    <option value="ALL">{isEn ? 'All Statuses' : 'Tutti gli Esiti'}</option>
                    <option value="In corso">{isEn ? 'In progress' : 'In corso'}</option>
                    <option value="Trattativa">{isEn ? 'Negotiation' : 'Trattativa'}</option>
                    <option value="Accettato">
                      {isEn ? 'Accepted (Closed)' : 'Accettato (Chiuso)'}
                    </option>
                    <option value="Perso">{isEn ? 'Lost' : 'Perso'}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="filter-role" className="sr-only">
                    {isEn ? 'Filter by role' : 'Filtra per ruolo'}
                  </label>
                  <select
                    id="filter-role"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-sm text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                  >
                    <option value="ALL">{isEn ? 'All Roles' : 'Tutti i Ruoli'}</option>
                    <option value="Acquirente">{isEn ? 'Buyer' : 'Acquirente'}</option>
                    <option value="Venditore">{isEn ? 'Seller' : 'Venditore'}</option>
                    <option value="Inquilino">{isEn ? 'Tenant' : 'Inquilino'}</option>
                    <option value="Locatore">
                      {isEn ? 'Landlord (Owner)' : 'Locatore (Proprietario)'}
                    </option>
                  </select>
                </div>

                <div>
                  <label htmlFor="filter-tag" className="sr-only">
                    {isEn ? 'Filter by tag' : 'Filtra per etichetta'}
                  </label>
                  <select
                    id="filter-tag"
                    value={activeTagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-sm text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                  >
                    <option value="ALL">{isEn ? 'All Tags' : 'Tutte le Etichette'}</option>
                    {availableTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {translateSuggestedTag(tag, lang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="sort-select" className="sr-only">
                    {isEn ? 'Sort clients' : 'Ordina clienti'}
                  </label>
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-sm text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                  >
                    <option value="default">{isEn ? 'Default order' : 'Ordine predefinito'}</option>
                    <option value="name-asc">{isEn ? 'Name (A-Z)' : 'Nome (A-Z)'}</option>
                    <option value="price-desc">
                      {isEn ? 'Price (High to Low)' : 'Prezzo (Decrescente)'}
                    </option>
                    <option value="price-asc">
                      {isEn ? 'Price (Low to High)' : 'Prezzo (Crescente)'}
                    </option>
                    <option value="reminder-asc">
                      {isEn ? 'Next Follow-up' : 'Prossimo Richiamo'}
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 text-xs text-[#4a707a]">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 bg-white border border-[#cbe2de] rounded-lg px-2.5 py-1">
                    <Euro className="w-3.5 h-3.5 text-[#0e4d5f] shrink-0" aria-hidden="true" />
                    <span className="font-semibold text-[#0e4d5f] whitespace-nowrap">Budget</span>
                    <label htmlFor="filter-budget-min" className="sr-only">
                      {isEn ? 'Minimum budget in Euro' : 'Budget minimo in Euro'}
                    </label>
                    <input
                      id="filter-budget-min"
                      data-testid="filter-budget-min"
                      type="number"
                      min="0"
                      step="5000"
                      inputMode="numeric"
                      value={minBudgetInput}
                      onChange={(e) => setMinBudgetInput(e.target.value)}
                      placeholder={isEn ? 'Min €' : 'Da €'}
                      className="w-24 sm:w-28 bg-[#f4faf9] border border-[#dbeae7] rounded px-2 py-1 text-xs text-[#0f3b47] placeholder-[#6c8f98] font-mono tabular-nums focus:outline-none focus:border-[#2eb086]"
                    />
                    <span aria-hidden="true" className="text-[#6c8f98]">
                      –
                    </span>
                    <label htmlFor="filter-budget-max" className="sr-only">
                      {isEn ? 'Maximum budget in Euro' : 'Budget massimo in Euro'}
                    </label>
                    <input
                      id="filter-budget-max"
                      data-testid="filter-budget-max"
                      type="number"
                      min="0"
                      step="5000"
                      inputMode="numeric"
                      value={maxBudgetInput}
                      onChange={(e) => setMaxBudgetInput(e.target.value)}
                      placeholder={isEn ? 'Max €' : 'A €'}
                      className="w-24 sm:w-28 bg-[#f4faf9] border border-[#dbeae7] rounded px-2 py-1 text-xs text-[#0f3b47] placeholder-[#6c8f98] font-mono tabular-nums focus:outline-none focus:border-[#2eb086]"
                    />
                  </div>

                  <span data-testid="results-count" className="px-0.5 tabular-nums">
                    {filteredClients.length === visiblePool.length
                      ? isEn
                        ? `${visiblePool.length} active clients${
                            clients.length > visiblePool.length
                              ? ` (out of ${clients.length} stored)`
                              : ''
                          }`
                        : `${visiblePool.length} clienti attivi${
                            clients.length > visiblePool.length
                              ? ` (su ${clients.length} in archivio)`
                              : ''
                          }`
                      : isEn
                        ? `Showing ${filteredClients.length} of ${visiblePool.length} clients`
                        : `Visualizzati ${filteredClients.length} di ${visiblePool.length} clienti`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    data-testid="filter-photos-btn"
                    aria-pressed={withPhotosOnly}
                    onClick={() => setWithPhotosOnly((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                      withPhotosOnly
                        ? 'bg-[#e6f7f1] border-[#2eb086] text-[#177858]'
                        : 'bg-white border-[#cbe2de] text-[#0e4d5f] hover:bg-[#eef6f5]'
                    }`}
                  >
                    <Camera
                      className={`w-3.5 h-3.5 ${
                        withPhotosOnly ? 'text-[#177858]' : 'text-[#0e4d5f]'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{isEn ? 'Photos Only' : 'Solo con Foto'}</span>
                    <span className="font-mono tabular-nums text-[11px] font-bold">
                      ({withPhotosCount})
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="filter-favorites-btn"
                    aria-pressed={favoritesOnly}
                    onClick={() => setFavoritesOnly((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                      favoritesOnly
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-white border-[#cbe2de] text-[#0e4d5f] hover:bg-[#eef6f5]'
                    }`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        favoritesOnly ? 'fill-amber-400 text-amber-500' : 'text-amber-500'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{isEn ? 'Favorites Only' : 'Solo Preferiti'}</span>
                    <span className="font-mono tabular-nums text-[11px] font-bold">
                      ({favoritesCount})
                    </span>
                  </button>
                  {hasFilters && (
                    <button
                      type="button"
                      data-testid="clear-filters-btn"
                      onClick={clearFilters}
                      className="text-[#0e4d5f] hover:text-[#177858] font-semibold underline whitespace-nowrap"
                    >
                      {isEn ? 'Reset filters' : 'Azzera filtri'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CONTENT VIEWS with smooth fade-in / slide-up screen transitions */}
        <div key={activeTab} className="animate-view-enter">
          {activeTab === 'all' && (
            <section aria-label={isEn ? 'Client list' : 'Elenco clienti'}>
              {filteredClients.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[#cbe2de] bg-white rounded-xl space-y-3">
                  <FolderOpen className="w-10 h-10 text-[#8bb3bd] mx-auto" aria-hidden="true" />
                  <h2 className="text-base font-bold text-[#0e4d5f]">
                    {isEn ? 'No clients found' : 'Nessun cliente presente o trovato'}
                  </h2>
                  <p className="text-xs text-[#5a808a] max-w-sm mx-auto">
                    {isEn
                      ? 'You can add a new client, adjust your filters, or load the sample demo cards.'
                      : 'Puoi aggiungere un nuovo cliente, modificare i filtri oppure caricare le schede demo di prova.'}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="px-4 py-2 rounded-lg bg-white border border-[#cbe2de] hover:bg-[#f0f7f6] text-[#0e4d5f] text-xs font-semibold"
                      >
                        {isEn ? 'Reset Filters' : 'Azzera Filtri'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLoad50Demo}
                      className="px-4 py-2 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold"
                    >
                      {isEn ? 'Load 50 Demo Clients' : 'Carica 50 Clienti Demo'}
                    </button>
                    <button
                      type="button"
                      onClick={openNewClientModal}
                      className="px-4 py-2 rounded-lg bg-[#177858] hover:bg-[#125f46] text-white text-xs font-semibold"
                    >
                      {isEn ? '+ New Client' : '+ Nuovo Cliente'}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  data-testid="clients-grid"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {filteredClients.map((client) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      allowExtraChannels={allowExtraChannels}
                      onEdit={openEditClientModal}
                      onDelete={handleDeleteClient}
                      onToggleFavorite={handleToggleFavorite}
                      onDownloadPdf={handleDownloadClientPdf}
                      onSelectTag={(tag) =>
                        setTagFilter((prev) =>
                          prev.toLowerCase() === tag.toLowerCase() ? 'ALL' : tag,
                        )
                      }
                      onOpenGallery={(clientId, idx) => {
                        const target = clients.find((c) => String(c.id) === String(clientId));
                        if (!target) return;
                        const photos = getClientPhotos(target);
                        if (photos.length === 0) return;
                        setGalleryState({
                          isOpen: true,
                          clientName: target.name,
                          photos,
                          initialIndex: idx,
                        });
                      }}
                      onRequireUpgrade={requireUpgrade}
                      onSearchPortals={handleSearchPortalsForClient}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              pool={visiblePool}
              selectedDayKey={selectedDayKey}
              allowExtraChannels={allowExtraChannels}
              onSelectDay={setSelectedDayKey}
              onSnooze={handleSnoozeReminder}
              onComplete={handleCompleteReminder}
              onEdit={openEditClientModal}
              onOpenFullAgenda={() => setActiveTab('reminders')}
              onRequireUpgrade={requireUpgrade}
              onNotify={showToast}
            />
          )}

          {activeTab === 'reminders' && (
            <RemindersView
              pool={visiblePool}
              selectedDayKey={selectedDayKey}
              allowExtraChannels={allowExtraChannels}
              onClearDayFilter={() => setSelectedDayKey(null)}
              onSnooze={handleSnoozeReminder}
              onComplete={handleCompleteReminder}
              onEdit={openEditClientModal}
              onRequestNotifications={handleRequestNotifications}
              onRequireUpgrade={requireUpgrade}
            />
          )}

          {activeTab === 'matching' && (
            <MatchingView
              pool={visiblePool}
              selectedPropertyId={selectedPropertyId}
              allowExtraChannels={allowExtraChannels}
              onSelectProperty={setSelectedPropertyId}
            />
          )}

          {activeTab === 'find' && (
            <FindPropertyView
              portals={portals}
              clients={visiblePool}
              onUpdatePortals={handleUpdatePortals}
              onNotify={showToast}
            />
          )}
        </div>
      </main>

      {/* LEGAL & SUPPORT FOOTER */}
      <footer
        data-testid="app-footer"
        className="bg-white border-t border-[#cbe2de] mt-8 px-4 lg:px-8 py-6 pb-24 md:pb-20"
      >
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Owner & Legal Links */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#4a707a]">
              <span className="inline-flex items-center gap-1.5 font-bold text-[#0e4d5f]">
                <ShieldCheck className="w-4 h-4 text-[#2eb086]" aria-hidden="true" />
                ImmoPulse CRM
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {isEn ? 'Data Controller:' : 'Titolare del trattamento:'}{' '}
                <strong className="text-[#0e4d5f]">{LEGAL_OWNER_NAME}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {isEn ? 'Payments processed via Stripe' : 'Pagamenti gestiti tramite Stripe'}
              </span>
            </div>

            <nav
              aria-label={isEn ? 'Legal notices' : 'Informative legali'}
              className="flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              {LEGAL_DOC_ORDER.map((docKey) => (
                <button
                  key={docKey}
                  type="button"
                  data-testid={`legal-link-${docKey}`}
                  onClick={() => setActiveLegalDoc(docKey)}
                  className="text-xs font-semibold text-[#0e4d5f] hover:text-[#177858] underline underline-offset-2 transition-colors"
                >
                  {legalDocs[docKey].shortLabel}
                </button>
              ))}
            </nav>
          </div>

          {/* Right: Supporto & Assistenza Rapida */}
          <div
            data-testid="support-section"
            className="bg-[#f4faf9] border border-[#cbe2de] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex items-center gap-2 text-xs text-[#0e4d5f]">
              <LifeBuoy className="w-4 h-4 text-[#2eb086] shrink-0" aria-hidden="true" />
              <div>
                <div className="font-bold">
                  {isEn ? 'Support & Assistance' : 'Supporto & Assistenza'}
                </div>
                <div className="text-[11px] text-[#4a707a]">
                  {isEn
                    ? 'Fast technical and billing help'
                    : 'Risposta rapida tecnica e amministrativa'}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={buildSupportEmailUrl(currentUser?.email, activePlan, lang)}
                data-testid="support-email-btn"
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#0e4d5f]" aria-hidden="true" />
                <span>{isEn ? 'Send Email' : 'Invia Email'}</span>
              </a>
              <a
                href={buildSupportWhatsAppUrl(currentUser?.email, activePlan, lang)}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="support-whatsapp-btn"
                className="px-3 py-1.5 rounded-lg bg-[#177858] hover:bg-[#125f46] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isEn ? 'WhatsApp Support' : 'WhatsApp Supporto'}</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* 5-ITEM MOBILE BOTTOM NAVBAR (Dashboard, Clienti, + Nuovo centrale, Matching, Cerca) */}
      <nav
        aria-label={isEn ? 'Mobile navigation' : 'Navigazione mobile'}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#cbe2de] px-2 pt-1.5 pb-[calc(0.45rem+env(safe-area-inset-bottom))] grid grid-cols-5 items-end shadow-[0_-4px_20px_rgba(14,77,95,0.06)]"
      >
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'dashboard' ? 'text-[#0e4d5f] font-bold' : 'text-[#5a808a]'
          }`}
        >
          <BarChart3 className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] mt-0.5 leading-none whitespace-nowrap">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'all' ? 'text-[#0e4d5f] font-bold' : 'text-[#5a808a]'
          }`}
        >
          <Users className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] mt-0.5 leading-none whitespace-nowrap">
            {isEn ? 'Clients' : 'Clienti'}
          </span>
        </button>

        {/* Centered Elevated + Nuovo Button */}
        <button
          type="button"
          data-testid="mobile-nav-new-btn"
          onClick={openNewClientModal}
          className="flex flex-col items-center justify-center pb-0.5 text-[#177858] font-bold"
        >
          <span className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-br from-[#177858] to-[#0e4d5f] text-white shadow-lg shadow-[#177858]/30 ring-4 ring-white flex items-center justify-center">
            <Plus className="w-6 h-6" aria-hidden="true" />
          </span>
          <span className="text-[11px] mt-1 leading-none whitespace-nowrap">
            {isEn ? 'New' : 'Nuovo'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matching')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'matching' ? 'text-[#0e4d5f] font-bold' : 'text-[#5a808a]'
          }`}
        >
          <GitCompare className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] mt-0.5 leading-none whitespace-nowrap">Matching</span>
        </button>

        <button
          type="button"
          data-testid="mobile-tab-find"
          onClick={() => setActiveTab('find')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'find' ? 'text-[#0e4d5f] font-bold' : 'text-[#5a808a]'
          }`}
        >
          <Search className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] mt-0.5 leading-none whitespace-nowrap">
            {isEn ? 'Search' : 'Cerca'}
          </span>
        </button>
      </nav>

      {/* MODALS */}
      <ClientFormModal
        isOpen={clientModalOpen}
        editingClient={editingClient}
        onClose={() => setClientModalOpen(false)}
        onSave={handleSaveClient}
        onDownloadPdf={handleDownloadClientPdf}
        onNotify={showToast}
      />

      <ExportModal
        isOpen={exportModalOpen}
        clientLimit={clientLimit}
        onClose={() => setExportModalOpen(false)}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onLimitExceeded={(count) =>
          openPlansModal(
            isEn
              ? `The backup contains ${count} cards, but your current plan allows up to ${clientLimit} clients. Upgrade to Single Pro or Agency / Team to import it.`
              : `Il backup contiene ${count} schede, ma il tuo piano attuale consente massimo ${clientLimit} clienti. Passa a Singolo Pro o Agenzia / Team per importarlo.`,
          )
        }
      />

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        contextMessage={authContextMsg}
        onClose={() => {
          setPendingPlanAfterAuth(null);
          setAuthModalOpen(false);
        }}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      <PlansModal
        isOpen={plansModalOpen}
        contextMessage={plansContextMsg}
        currentUser={currentUser}
        activePlan={activePlan}
        preselectedPlan={preselectedPlan}
        subscriptionStatus={subscriptionStatus}
        savedLicenseCode={savedLicenseCode}
        onClose={() => setPlansModalOpen(false)}
        onRequireAuthForPlan={(plan) => {
          setPendingPlanAfterAuth(plan);
          setPlansModalOpen(false);
          handleOpenAuth(
            'register',
            isEn
              ? 'To activate a paid plan, please sign in or register for free.'
              : 'Per attivare un piano a pagamento accedi o registrati gratuitamente.',
          );
        }}
        onConfirmPayment={handleConfirmPlanPayment}
        onVerifyLicenseCode={handleVerifyLicenseCode}
      />

      <AgencySyncModal
        isOpen={agencyModalOpen}
        activePlan={activePlan}
        defaultAgentName={currentUser?.name || ''}
        workspace={agencyWorkspace}
        status={agencySync.status}
        connectionId={agencySync.connectionId}
        activeAgencyCode={agencySync.activeAgencyCode}
        activeAgencyName={agencySync.activeAgencyName}
        members={agencySync.members}
        recentEvents={agencySync.recentEvents}
        onClose={() => setAgencyModalOpen(false)}
        onConnectWorkspace={handleConnectAgencyWorkspace}
        onDisconnectWorkspace={handleDisconnectAgencyWorkspace}
        onOpenAgencyPlanUpgrade={() =>
          openPlansModal(
            isEn
              ? 'Activate the Agency / Team Plan (€ 149,00 / year) to connect all devices and agents in your office in real time.'
              : 'Attiva il Piano Agenzia / Team (€ 149,00 / anno) per collegare tutti i dispositivi e gli agenti della tua agenzia in tempo reale.',
            'agency',
          )
        }
        onNotify={showToast}
      />

      <GalleryModal
        isOpen={galleryState.isOpen}
        clientName={galleryState.clientName}
        photos={galleryState.photos}
        initialIndex={galleryState.initialIndex}
        onClose={() => setGalleryState((prev) => ({ ...prev, isOpen: false }))}
      />

      <LegalInfoModal
        docKey={activeLegalDoc}
        onSelectDoc={setActiveLegalDoc}
        onClose={() => setActiveLegalDoc(null)}
      />

      {/* MOBILE PROFILE & TOOLS BOTTOM-SHEET MODAL */}
      {profileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-menu-title"
          data-testid="profile-menu-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProfileMenuOpen(false);
          }}
          className="fixed inset-0 z-50 bg-[#092b35]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-backdrop"
        >
          <div className="bg-white border border-[#cbe2de] w-full max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl animate-bottom-sheet">
            <div className="w-10 h-1 bg-[#cbe2de] rounded-full mx-auto mt-2.5 sm:hidden" />
            <div className="px-5 py-3.5 border-b border-[#e1f0ed] flex items-center justify-between bg-[#f4faf9]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#0e4d5f] text-white flex items-center justify-center shrink-0">
                  <User className="w-4.5 h-4.5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 id="profile-menu-title" className="font-bold text-sm text-[#0e4d5f] truncate">
                    {currentUser
                      ? currentUser.name
                      : isEn
                        ? 'Guest Profile'
                        : 'Profilo Ospite'}
                  </h2>
                  <p className="text-[11px] text-[#4a707a] truncate">
                    {currentUser ? currentUser.email : planSummaryText}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(false)}
                aria-label={isEn ? 'Close profile menu' : 'Chiudi menu profilo'}
                className="p-1.5 rounded-lg text-[#5a808a] hover:text-[#0e4d5f]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[75vh] overflow-y-auto">
              {/* Account Sign In / Sign Out */}
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-between"
                >
                  <span className="inline-flex items-center gap-2">
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span>{isEn ? 'Sign Out' : 'Esci dall’account'}</span>
                  </span>
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="menu-auth-btn"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    handleOpenAuth('register');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-bold flex items-center justify-between"
                >
                  <span className="inline-flex items-center gap-2">
                    <User className="w-4 h-4" aria-hidden="true" />
                    <span>{isEn ? 'Sign In / Register' : 'Accedi / Registrati'}</span>
                  </span>
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              )}

              {/* Subscriptions & Licenses */}
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  openPlansModal();
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 text-xs font-bold flex items-center justify-between"
              >
                <span className="inline-flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-600" aria-hidden="true" />
                  <span>
                    {activePlan === 'free'
                      ? isEn
                        ? 'Subscriptions (Monthly · Annual · Team)'
                        : 'Abbonamenti (Mensile · Annuale · Team)'
                      : isEn
                        ? 'Manage Subscription & License'
                        : 'Gestisci Abbonamento e Licenza'}
                  </span>
                </span>
                {activePlan !== 'free' ? (
                  <span className="px-2 py-0.5 rounded bg-[#e6f7f1] text-[#177858] text-[10px] font-bold">
                    {isEn ? 'PRO' : 'ATTIVO'}
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              {/* App PWA Install */}
              <div className="w-full px-3.5 py-2 rounded-xl bg-[#f4faf9] border border-[#cbe2de] flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#0e4d5f]">
                  {isEn ? 'Install Mobile App' : 'Installa su Smartphone'}
                </span>
                <PWAInstallButton />
              </div>

              {/* +50 Demo Clients */}
              <button
                type="button"
                data-testid="menu-demo-btn"
                onClick={() => {
                  setProfileMenuOpen(false);
                  handleLoad50Demo();
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold flex items-center justify-between"
              >
                <span className="inline-flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#2eb086]" aria-hidden="true" />
                  <span>{isEn ? '+50 Demo Clients' : '+50 Demo Clienti'}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-[#5a808a]" aria-hidden="true" />
              </button>

              {/* Download Backup & CSV */}
              <button
                type="button"
                data-testid="menu-download-btn"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setExportModalOpen(true);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold flex items-center justify-between"
              >
                <span className="inline-flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#0e4d5f]" aria-hidden="true" />
                  <span>{isEn ? 'Download & Backup (.JSON / .CSV)' : 'Download & Backup (.JSON / .CSV)'}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-[#5a808a]" aria-hidden="true" />
              </button>

              {/* Follow-ups & Alerts */}
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setActiveTab('reminders');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold flex items-center justify-between"
              >
                <span className="inline-flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#0e4d5f]" aria-hidden="true" />
                  <span>{isEn ? 'Follow-ups & Alerts' : 'Agenda Richiami e Notifiche'}</span>
                </span>
                {metrics.remindersDue > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold font-mono">
                    {metrics.remindersDue}
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#5a808a]" aria-hidden="true" />
                )}
              </button>

              {/* Team Sync */}
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setAgencyModalOpen(true);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold flex items-center justify-between"
              >
                <span className="inline-flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-[#177858]" aria-hidden="true" />
                  <span>
                    {agencySync.isConnected
                      ? isEn
                        ? `Live Team (${agencySync.members.length} online)`
                        : `Team Live (${agencySync.members.length} online)`
                      : isEn
                        ? 'Agency Team Multi-Device Sync'
                        : 'Sincronizzazione Team Agenzia'}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-[#5a808a]" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE FILTERS BOTTOM-SHEET MODAL */}
      {mobileFiltersOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-filters-title"
          data-testid="mobile-filters-sheet"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileFiltersOpen(false);
          }}
          className="fixed inset-0 z-50 bg-[#092b35]/60 backdrop-blur-sm flex items-end justify-center animate-backdrop md:hidden"
        >
          <div className="bg-white border-t border-[#cbe2de] w-full rounded-t-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] animate-bottom-sheet">
            <div className="w-10 h-1 bg-[#cbe2de] rounded-full mx-auto mt-2.5" />
            <div className="px-5 py-3 border-b border-[#e1f0ed] flex items-center justify-between bg-[#f4faf9]">
              <h2 id="mobile-filters-title" className="font-bold text-sm text-[#0e4d5f] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#177858]" aria-hidden="true" />
                <span>{isEn ? 'Filter Clients' : 'Filtra Clienti'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label={isEn ? 'Close filters' : 'Chiudi filtri'}
                className="p-1.5 rounded-lg text-[#5a808a] hover:text-[#0e4d5f]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#4a707a] mb-1">
                    {isEn ? 'Status' : 'Esito'}
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-white border border-[#cbe2de] rounded-xl px-3 py-2 text-xs text-[#0f3b47]"
                  >
                    <option value="ALL">{isEn ? 'All Statuses' : 'Tutti gli Esiti'}</option>
                    <option value="In corso">{isEn ? 'In progress' : 'In corso'}</option>
                    <option value="Trattativa">{isEn ? 'Negotiation' : 'Trattativa'}</option>
                    <option value="Accettato">{isEn ? 'Accepted' : 'Accettato'}</option>
                    <option value="Perso">{isEn ? 'Lost' : 'Perso'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#4a707a] mb-1">
                    {isEn ? 'Role' : 'Ruolo'}
                  </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full bg-white border border-[#cbe2de] rounded-xl px-3 py-2 text-xs text-[#0f3b47]"
                  >
                    <option value="ALL">{isEn ? 'All Roles' : 'Tutti i Ruoli'}</option>
                    <option value="Acquirente">{isEn ? 'Buyer' : 'Acquirente'}</option>
                    <option value="Venditore">{isEn ? 'Seller' : 'Venditore'}</option>
                    <option value="Inquilino">{isEn ? 'Tenant' : 'Inquilino'}</option>
                    <option value="Locatore">{isEn ? 'Landlord' : 'Locatore'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#4a707a] mb-1">
                    {isEn ? 'Tag' : 'Etichetta'}
                  </label>
                  <select
                    value={activeTagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="w-full bg-white border border-[#cbe2de] rounded-xl px-3 py-2 text-xs text-[#0f3b47]"
                  >
                    <option value="ALL">{isEn ? 'All Tags' : 'Tutte'}</option>
                    {availableTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {translateSuggestedTag(tag, lang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#4a707a] mb-1">
                    {isEn ? 'Sort by' : 'Ordina'}
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full bg-white border border-[#cbe2de] rounded-xl px-3 py-2 text-xs text-[#0f3b47]"
                  >
                    <option value="default">{isEn ? 'Default' : 'Predefinito'}</option>
                    <option value="name-asc">{isEn ? 'Name (A-Z)' : 'Nome (A-Z)'}</option>
                    <option value="price-desc">{isEn ? 'Price ↓' : 'Prezzo ↓'}</option>
                    <option value="price-asc">{isEn ? 'Price ↑' : 'Prezzo ↑'}</option>
                    <option value="reminder-asc">{isEn ? 'Follow-up' : 'Richiamo'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4a707a] mb-1">
                  {isEn ? 'Budget Range (€)' : 'Fascia Budget (€)'}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    inputMode="numeric"
                    value={minBudgetInput}
                    onChange={(e) => setMinBudgetInput(e.target.value)}
                    placeholder={isEn ? 'Min €' : 'Da €'}
                    className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-xl px-3 py-2 text-xs text-[#0f3b47] font-mono tabular-nums"
                  />
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    inputMode="numeric"
                    value={maxBudgetInput}
                    onChange={(e) => setMaxBudgetInput(e.target.value)}
                    placeholder={isEn ? 'Max €' : 'A €'}
                    className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-xl px-3 py-2 text-xs text-[#0f3b47] font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  aria-pressed={withPhotosOnly}
                  onClick={() => setWithPhotosOnly((prev) => !prev)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 border ${
                    withPhotosOnly
                      ? 'bg-[#e6f7f1] border-[#2eb086] text-[#177858]'
                      : 'bg-white border-[#cbe2de] text-[#0e4d5f]'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isEn ? `Photos (${withPhotosCount})` : `Foto (${withPhotosCount})`}</span>
                </button>
                <button
                  type="button"
                  aria-pressed={favoritesOnly}
                  onClick={() => setFavoritesOnly((prev) => !prev)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 border ${
                    favoritesOnly
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-white border-[#cbe2de] text-[#0e4d5f]'
                  }`}
                >
                  <Star
                    className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-amber-400 text-amber-500' : 'text-amber-500'}`}
                    aria-hidden="true"
                  />
                  <span>{isEn ? `Favorites (${favoritesCount})` : `Preferiti (${favoritesCount})`}</span>
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-[#e1f0ed] bg-[#f4faf9] flex items-center gap-2.5">
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2.5 rounded-xl bg-white border border-[#cbe2de] text-[#0e4d5f] text-xs font-bold"
                >
                  {isEn ? 'Reset' : 'Azzera'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-bold"
              >
                {isEn
                  ? `Show ${filteredClients.length} clients`
                  : `Mostra ${filteredClients.length} clienti`}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentSuccessModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-success-modal-title"
          data-testid="payment-success-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPaymentSuccessModalOpen(false);
          }}
          className="fixed inset-0 z-[65] bg-[#092b35]/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-backdrop"
        >
          <div className="bg-white border border-[#cbe2de] w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-5 text-center animate-bottom-sheet">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#e6f7f1] border border-[#2eb086]/40 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#177858]" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2
                id="payment-success-modal-title"
                className="text-lg font-bold text-[#0e4d5f] leading-snug"
              >
                {isEn
                  ? 'Payment completed successfully! Your ImmoPulse Pro license is now active.'
                  : 'Pagamento completato con successo! La tua licenza ImmoPulse Pro è ora attiva.'}
              </h2>
              <p className="text-xs text-[#4a707a] leading-relaxed">
                {isEn
                  ? 'All Pro features are unlocked on this browser: unlimited clients & photos, WhatsApp, Maps, PDF Export, Smart Matching, and Backup.'
                  : 'Tutte le funzionalità Pro sono sbloccate su questo browser: clienti e foto illimitati, WhatsApp, Maps, Export PDF, Matching e Backup.'}
              </p>
            </div>
            <button
              type="button"
              data-testid="payment-success-start-btn"
              onClick={() => setPaymentSuccessModalOpen(false)}
              className="w-full py-2.5 px-5 rounded-xl bg-[#177858] hover:bg-[#125f46] text-white text-sm font-semibold transition-colors shadow-2xs"
            >
              {isEn ? 'Get started now' : 'Inizia subito'}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />

      <MultiPortalLauncherModal
        isOpen={portalLauncherState.isOpen}
        title={portalLauncherState.title}
        subtitle={portalLauncherState.subtitle}
        portals={portalLauncherState.portals}
        blockedCount={portalLauncherState.blockedCount}
        onClose={() => setPortalLauncherState((prev) => ({ ...prev, isOpen: false }))}
        onCopyAll={async () => {
          const text = portalLauncherState.portals
            .map((p) => `${p.name}: ${p.url}`)
            .join('\n');
          try {
            await navigator.clipboard.writeText(text);
            showToast(
              isEn ? 'All 4 portal URLs copied.' : 'Tutti e 4 i link copiati negli appunti.',
              'success',
            );
          } catch {
            showToast(
              isEn ? 'Click any portal button above.' : 'Clicca i portali direttamente qui sopra.',
              'info',
            );
          }
        }}
      />

      <RealEstateChatbot
        clients={visiblePool}
        metrics={metrics}
        activePlan={activePlan}
        agencyCode={agencySync.activeAgencyCode}
      />

      <OfflineIndicator />

      {/* TOAST NOTIFICATIONS */}
      <div
        aria-live="polite"
        className="fixed bottom-36 md:bottom-24 left-4 right-4 sm:left-auto sm:right-6 z-[70] flex flex-col gap-2 pointer-events-none sm:max-w-md"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto px-4 py-2.5 rounded-lg border shadow-lg text-xs font-medium ${
              toast.type === 'error'
                ? 'bg-rose-700 text-white border-rose-800'
                : 'bg-[#0e4d5f] text-white border-[#2eb086]'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
