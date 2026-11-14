import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  Building2,
  Camera,
  Crown,
  Database,
  Download,
  Euro,
  FolderOpen,
  GitCompare,
  Lock,
  LogOut,
  Plus,
  PlusCircle,
  Search,
  Star,
  Users,
  Wifi,
} from 'lucide-react';
import { AgencySyncModal } from './components/AgencySyncModal';
import { AuthModal } from './components/AuthModal';
import { BrandLogo } from './components/BrandLogo';
import { ClientCard } from './components/ClientCard';
import { ClientFormModal } from './components/ClientFormModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DashboardView } from './components/DashboardView';
import { ExportModal } from './components/ExportModal';
import { GalleryModal } from './components/GalleryModal';
import { MatchingView } from './components/MatchingView';
import { MetricsStrip } from './components/MetricsStrip';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PlansModal } from './components/PlansModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { RemindersView } from './components/RemindersView';
import { useAgencySync } from './hooks/useAgencySync';
import type {
  ActiveTab,
  AgencyWorkspaceConfig,
  ClientRecord,
  ConfirmDialogState,
  PaidPlanTier,
  SortOption,
  ToastMessage,
  UserAccount,
} from './types/crm';
import {
  applyDeleteClientSync,
  applyUpsertClientSync,
  canUseAgencySync,
  canUseWhatsAppAndMap,
  computeMetrics,
  filterAndSortClients,
  generateCsvContent,
  generateDemoClients,
  getActivePlan,
  getAvailableTags,
  getClientLimit,
  getClientPhotos,
  getVisibleClientsPool,
  isValidClient,
  localDateTimeValue,
  normalizeClientRecord,
  parseBudgetBound,
  toggleClientFavorite,
} from './utils/crmLogic';
import { downloadBlob } from './utils/imageCompression';
import {
  clearAgencyWorkspace,
  clearSessionEmail,
  getAccounts,
  loadAgencyWorkspace,
  loadSessionEmail,
  loadStoredClientsRaw,
  saveAccounts,
  saveAgencyWorkspace,
  saveSessionEmail,
  saveStoredClients,
} from './utils/storage';

function loadInitialUser(): UserAccount | null {
  const email = loadSessionEmail();
  if (!email) return null;
  const accounts = getAccounts();
  return accounts.find((a) => a.email === email) || null;
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
    const seed = generateDemoClients(plan === 'full' || plan === 'agency' ? 50 : 2);
    saveStoredClients(seed);
    return { clients: seed, corrupted: false };
  } catch {
    return { clients: [], corrupted: true };
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => loadInitialUser());
  const [initialData] = useState(() => loadInitialClients(loadInitialUser()));
  const [clients, setClients] = useState<ClientRecord[]>(initialData.clients);
  const clientsRef = useRef<ClientRecord[]>(initialData.clients);
  clientsRef.current = clients;

  const [corruptedStorage, setCorruptedStorage] = useState<boolean>(initialData.corrupted);

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

  // Modal states
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

  const [agencyModalOpen, setAgencyModalOpen] = useState(false);
  const [agencyWorkspace, setAgencyWorkspace] = useState<AgencyWorkspaceConfig | null>(() =>
    loadAgencyWorkspace(),
  );

  const [galleryState, setGalleryState] = useState<{
    isOpen: boolean;
    clientName: string;
    photos: string[];
    initialIndex: number;
  }>({ isOpen: false, clientName: '', photos: [], initialIndex: 0 });

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
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
        'Archivio locale danneggiato: i dati originali non sono stati sovrascritti. Importa un backup valido.',
        'error',
      );
      setCorruptedStorage(false);
    }
  }, [corruptedStorage, showToast]);

  const anyModalOpen =
    clientModalOpen ||
    exportModalOpen ||
    authModalOpen ||
    plansModalOpen ||
    agencyModalOpen ||
    galleryState.isOpen ||
    confirmDialog !== null;

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', anyModalOpen);
    return () => document.body.classList.remove('overflow-hidden');
  }, [anyModalOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmDialog) {
          setConfirmDialog(null);
        } else if (galleryState.isOpen) {
          setGalleryState((prev) => ({ ...prev, isOpen: false }));
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
    confirmDialog,
    galleryState.isOpen,
    clientModalOpen,
    exportModalOpen,
    authModalOpen,
    plansModalOpen,
    agencyModalOpen,
  ]);

  const activePlan = getActivePlan(currentUser);
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
          showToast(`Archivio agenzia (${agencyCode}) aggiornato in tempo reale.`, 'info');
        }
      },
      [showToast],
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
          'Salvataggio non riuscito: memoria del browser insufficiente. Rimuovi qualche foto o esporta un backup.',
          'error',
        );
        return false;
      }
      clientsRef.current = nextClients;
      setClients(nextClients);
      return true;
    },
    [showToast],
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
          `${reason} Accedi o registrati e attiva Basic (€ 14,99/mese), Completo (€ 24,99/mese) o Azienda (€ 59/anno).`,
        );
      } else {
        openPlansModal(reason);
      }
    },
    [currentUser, openPlansModal],
  );

  const openNewClientModal = () => {
    if (clients.length >= clientLimit) {
      if (activePlan === 'free') {
        requireUpgrade(
          `Limite raggiunto: senza abbonamento puoi gestire massimo ${clientLimit} clienti. Accedi/Registrati e attiva Basic, Completo o Azienda.`,
        );
      } else if (activePlan === 'basic') {
        openPlansModal(
          `Limite Piano Basic raggiunto: non puoi aggiungere più di ${clientLimit} clienti. Passa a Completo (€ 24,99/mese) o Azienda (€ 59/anno) per clienti illimitati.`,
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
      showToast('Scheda cliente non trovata.', 'error');
      return;
    }
    setEditingClient(found);
    setClientModalOpen(true);
  };

  const handleSaveClient = (clientData: ClientRecord, isEdit: boolean): boolean => {
    if (!isEdit && clients.length >= clientLimit) {
      setClientModalOpen(false);
      requireUpgrade(`Limite massimo di ${clientLimit} clienti raggiunto per il tuo piano attuale.`);
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
    showToast(isEdit ? 'Scheda cliente aggiornata.' : 'Nuovo cliente aggiunto.');
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
          ? `${target.name} rimosso dai preferiti.`
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
      showToast('Scheda cliente non trovata.', 'error');
      return;
    }
    try {
      const { downloadClientPdf } = await import('./utils/clientPdf');
      const filename = downloadClientPdf(target);
      showToast(`Scheda PDF scaricata (${filename}).`);
    } catch {
      showToast('Impossibile generare il PDF per questo cliente.', 'error');
    }
  };

  const handleDeleteClient = (id: string) => {
    const found = clients.find((c) => String(c.id) === String(id));
    if (!found) {
      showToast('Cliente non trovato.', 'error');
      return;
    }
    setConfirmDialog({
      title: 'Elimina scheda cliente',
      message: `Eliminare definitivamente la scheda di ${found.name}? L'operazione non è reversibile.`,
      confirmLabel: 'Elimina cliente',
      variant: 'danger',
      onConfirm: () => {
        const next = clients.filter((c) => String(c.id) !== String(id));
        if (persistClients(next)) {
          if (allowAgencySync && agencyWorkspace) {
            agencySync.sendDelete(id);
          }
          showToast('Scheda cliente eliminata.');
        }
      },
    });
  };

  const handleLoad50Demo = () => {
    if (clientLimit < 50) {
      openPlansModal(
        `Il caricamento di 50 clienti demo richiede il piano Completo (€ 24,99/mese) o Azienda (€ 59/anno). Il tuo piano attuale consente massimo ${clientLimit} clienti.`,
      );
      return;
    }

    const applyDemo = () => {
      const demo = generateDemoClients(50);
      if (persistClients(demo)) {
        if (allowAgencySync && agencyWorkspace) {
          agencySync.sendReplace(demo, 'Ha caricato 50 clienti demo');
        }
        showToast('Caricate 50 schede clienti demo.');
      }
    };

    if (clients.length > 0) {
      setConfirmDialog({
        title: 'Carica 50 clienti demo',
        message:
          'Caricare i 50 clienti demo sostituirà l’archivio attuale. Esporta prima un backup JSON se desideri conservare i dati esistenti.',
        confirmLabel: 'Carica 50 demo',
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
      title: `Allinea archivio a ${clientLimit} clienti`,
      message: `Mantenere solo i primi ${clientLimit} clienti in archivio ed eliminare gli altri ${
        clients.length - clientLimit
      }? Esporta prima un backup JSON se vuoi conservarli.`,
      confirmLabel: `Mantieni primi ${clientLimit}`,
      variant: 'danger',
      onConfirm: () => {
        const next = clients.slice(0, clientLimit);
        if (persistClients(next)) {
          if (allowAgencySync && agencyWorkspace) {
            agencySync.sendReplace(next, `Allineamento archivio a ${clientLimit} clienti`);
          }
          showToast(`Archivio allineato al limite di ${clientLimit} clienti.`);
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
      showToast('Promemoria completato e rimosso dall’agenda.');
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
      showToast(`Richiamo posticipato di ${days} ${days === 1 ? 'giorno' : 'giorni'}.`);
    }
  };

  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('Questo browser non supporta le notifiche.', 'error');
      return;
    }
    if (!window.isSecureContext) {
      showToast('Le notifiche richiedono HTTPS o localhost.', 'error');
      return;
    }
    try {
      const permission =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
      if (permission === 'granted') {
        new Notification('ImmoPulse CRM', {
          body: 'Notifiche attivate. I promemoria vengono mostrati nell’agenda.',
        });
        showToast('Notifiche browser attivate.');
      } else if (permission === 'denied') {
        showToast('Notifiche bloccate dalle impostazioni del browser.', 'error');
      } else {
        showToast('Permesso notifiche non concesso.', 'info');
      }
    } catch {
      showToast('Non è stato possibile attivare le notifiche.', 'error');
    }
  };

  const handleOpenAuth = (mode: 'login' | 'register', message = '') => {
    setAuthMode(mode);
    setAuthContextMsg(message);
    setAuthModalOpen(true);
  };

  const handleLogin = (email: string, password: string): string | null => {
    const accounts = getAccounts();
    const found = accounts.find((a) => a.email === email && a.password === password);
    if (!found) {
      return 'Credenziali non valide. Controlla email e password oppure registrati.';
    }
    setCurrentUser(found);
    saveSessionEmail(found.email);
    setAuthModalOpen(false);
    showToast(`Bentornato, ${found.name}!`);
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
      return 'Esiste già un account con questa email. Effettua l’accesso.';
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
      return 'Impossibile salvare i dati dell’account nel browser (spazio esaurito).';
    }
    setCurrentUser(newUser);
    saveSessionEmail(newUser.email);
    setAuthModalOpen(false);
    showToast('Registrazione completata!');
    const nextPlan = pendingPlanAfterAuth;
    setPendingPlanAfterAuth(null);
    openPlansModal(
      'Account creato! Scegli il piano Basic (€ 14,99/mese), Completo (€ 24,99/mese) o Azienda (€ 59/anno).',
      nextPlan,
    );
    return null;
  };

  const handleLogout = () => {
    setConfirmDialog({
      title: 'Disconnetti account',
      message:
        'Vuoi disconnetterti? Tornerai alla modalità Ospite (massimo 3 clienti attivi, solo Chiama ed Email).',
      confirmLabel: 'Disconnetti',
      variant: 'primary',
      onConfirm: () => {
        setCurrentUser(null);
        clearSessionEmail();
        setAgencyWorkspace(null);
        clearAgencyWorkspace();
        showToast('Disconnessione effettuata.');
      },
    });
  };

  const handleConfirmPlanPayment = (plan: PaidPlanTier, paymentLabel: string) => {
    if (!currentUser) return;
    const accounts = getAccounts();
    const idx = accounts.findIndex((a) => a.email === currentUser.email);
    if (idx === -1) return;

    const updatedUser: UserAccount = {
      ...accounts[idx],
      plan,
      paymentMethod: paymentLabel,
      activatedAt: new Date().toISOString(),
    };
    const nextAccounts = accounts.map((a, i) => (i === idx ? updatedUser : a));
    if (!saveAccounts(nextAccounts)) {
      showToast('Impossibile salvare l’aggiornamento del piano nel browser.', 'error');
      return;
    }
    setCurrentUser(updatedUser);
    setPlansModalOpen(false);
    const planLabel =
      plan === 'basic'
        ? 'Basic (€14,99/mese)'
        : plan === 'full'
          ? 'Completo (€24,99/mese)'
          : 'Azienda Multi-Dispositivo (€59,00/anno)';
    showToast(`Piano ${planLabel} attivato con ${paymentLabel}!`);
    if (plan === 'agency') {
      setAgencyModalOpen(true);
    }
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
    showToast(`Dispositivo collegato alla stanza agenzia "${config.agencyCode}".`);
  };

  const handleDisconnectAgencyWorkspace = () => {
    clearAgencyWorkspace();
    setAgencyWorkspace(null);
    showToast('Dispositivo scollegato dal team in tempo reale.', 'info');
  };

  const handleExportCsv = () => {
    if (visiblePool.length === 0) {
      showToast('Nessun dato da esportare.', 'error');
      return;
    }
    const csv = generateCsvContent(visiblePool);
    downloadBlob(
      csv,
      `Clienti_ImmoPulse_${localDateTimeValue().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8',
    );
    showToast('Esportazione CSV completata.');
  };

  const handleExportJson = () => {
    downloadBlob(
      JSON.stringify(clients, null, 2),
      `Backup_ImmoPulse_${localDateTimeValue().slice(0, 10)}.json`,
      'application/json;charset=utf-8',
    );
    showToast('Backup JSON scaricato.');
  };

  const handleImportJson = (imported: ClientRecord[]) => {
    setConfirmDialog({
      title: 'Ripristina backup JSON',
      message: `Il backup contiene ${imported.length} schede. Sostituire l’archivio attuale?`,
      confirmLabel: 'Ripristina backup',
      variant: 'primary',
      onConfirm: () => {
        if (persistClients(imported)) {
          if (allowAgencySync && agencyWorkspace) {
            agencySync.sendReplace(imported, `Ha ripristinato un backup (${imported.length} schede)`);
          }
          setExportModalOpen(false);
          showToast('Backup ripristinato con successo.');
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

  const planSummaryText =
    activePlan === 'agency'
      ? 'Piano Azienda (€59/anno · Illimitato)'
      : activePlan === 'full'
        ? 'Piano Completo Illimitato'
        : activePlan === 'basic'
          ? 'Piano Basic (Max 10 clienti)'
          : currentUser
            ? 'Piano Free (Max 3 clienti)'
            : 'Modalità Ospite (Max 3 clienti)';

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f8f8] text-[#0f3b47] pb-20 md:pb-6">
      {/* TOP BAR CONTRACT: Brand — Navigation Links — 1 Primary Action */}
      <header className="md:sticky md:top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#cbe2de] px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('all');
            }}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#0e4d5f] rounded-lg"
          >
            <BrandLogo className="w-7 h-7 shrink-0" />
            <span className="font-display font-bold text-lg tracking-tight text-[#0e4d5f]">
              Immo<span className="text-[#2eb086]">Pulse</span>
            </span>
          </a>

          {/* Zone 2: Clean single-line Navigation Links */}
          <nav
            aria-label="Navigazione principale"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4a707a]"
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
              Clienti
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
              <span>Richiami</span>
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
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="py-1 whitespace-nowrap shrink-0 border-b-2 border-transparent hover:text-rose-700 transition-colors"
              >
                Esci ({currentUser.name})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenAuth('login')}
                className="py-1 whitespace-nowrap shrink-0 border-b-2 border-transparent hover:text-[#0e4d5f] transition-colors"
              >
                Accedi
              </button>
            )}
          </nav>

          {/* Zone 3: 1 Primary CTA Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={openNewClientModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Nuovo Cliente</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <main id="top" className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Workspace Utility Toolbar */}
        <section
          aria-label="Strumenti area di lavoro"
          className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#dbeae7]"
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
                Team {agencySync.activeAgencyCode} ({agencySync.members.length} dispositivi online)
              </button>
            ) : (
              <span>Agenda Immobiliare</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                aria-label={`Esci dall'account ${currentUser.name}`}
                className="md:hidden px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Esci</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenAuth('register')}
                className="md:hidden px-3 py-1.5 rounded-lg bg-white border border-[#cbe2de] text-[#0e4d5f] text-xs font-semibold whitespace-nowrap"
              >
                Accedi / Registrati
              </button>
            )}
            <PWAInstallButton />
            {allowAgencySync ? (
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
                    ? `Team Live (${agencySync.members.length})`
                    : agencySync.status === 'connecting'
                      ? 'Connessione Team...'
                      : 'Collega Team Live'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="agency-plan-cta"
                onClick={() =>
                  openPlansModal(
                    'Attiva il Piano Azienda (€ 59,00 / anno) per collegare tutti i dispositivi e gli agenti della tua agenzia in tempo reale.',
                    'agency',
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-[#eef6f5] hover:bg-[#dceceb] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Building2 className="w-3.5 h-3.5 text-[#0e4d5f]" aria-hidden="true" />
                <span>Team Azienda €59/anno</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openPlansModal()}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" /> Piani
            </button>
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
              aria-label="Attiva notifiche promemoria"
              title="Attiva notifiche promemoria"
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Notifiche</span>
            </button>
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              aria-label="Apri backup ed esportazione dati"
              title="Backup ed esportazione dati"
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Backup</span>
            </button>
          </div>
        </section>

        {/* Agency setup reminder when Azienda plan is active but room is not yet linked */}
        {allowAgencySync && !agencyWorkspace && (
          <section
            aria-label="Configura sincronizzazione agenzia"
            className="bg-white border border-[#2eb086]/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-start sm:items-center gap-3 text-xs text-[#25454e]">
              <Building2 className="w-4 h-4 text-[#0e4d5f] shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              <p>
                <strong>Piano Azienda attivo (€ 59,00/anno):</strong> crea o inserisci il{' '}
                <strong>Codice Agenzia</strong> per collegare in tempo reale tutti i dispositivi e
                gli agenti del tuo ufficio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAgencyModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Collega Dispositivi Ora
            </button>
          </section>
        )}

        {/* Plan Limit / Guest Notice Banner */}
        {(activePlan === 'free' || (activePlan === 'basic' && clients.length > clientLimit)) && (
          <section
            aria-label="Avviso limiti piano"
            className="bg-white border border-[#cbe2de] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-start sm:items-center gap-3 text-xs text-[#3b5e68]">
              <Lock className="w-4 h-4 text-[#0e4d5f] shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              {activePlan === 'basic' ? (
                <p>
                  <strong>Piano Basic attivo (max 10 clienti):</strong> hai {clients.length} schede
                  salvate, ma puoi gestire solo le prime 10. Passa a{' '}
                  <strong>Completo (€ 24,99/mese)</strong> o riduci l&apos;archivio a 10 per
                  aggiungerne di nuove.
                </p>
              ) : (
                <p>
                  <strong>Modalità limitata (max 3 clienti, solo Chiama ed Email):</strong>
                  {clients.length > clientLimit
                    ? ` Hai ${clients.length} clienti salvati ma solo i primi 3 sono attivi.`
                    : ''}{' '}
                  Accedi o registrati e attiva <strong>Basic (€ 14,99/mese)</strong> o{' '}
                  <strong>Completo (€ 24,99/mese)</strong> per sbloccare WhatsApp, Mappa e più
                  clienti.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {clients.length > clientLimit && (
                <button
                  type="button"
                  onClick={handleTrimToPlanLimit}
                  className="px-3 py-1.5 rounded-lg bg-[#eef6f5] hover:bg-[#dceceb] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold whitespace-nowrap"
                >
                  Mantieni primi {clientLimit}
                </button>
              )}
              {!currentUser && activePlan === 'free' && (
                <button
                  type="button"
                  onClick={() => handleOpenAuth('register')}
                  className="px-3 py-1.5 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold whitespace-nowrap"
                >
                  Accedi / Registrati
                </button>
              )}
              <button
                type="button"
                onClick={() => openPlansModal()}
                className="px-3 py-1.5 rounded-lg bg-[#177858] hover:bg-[#125f46] text-white text-xs font-semibold whitespace-nowrap"
              >
                {activePlan === 'basic' ? 'Passa a Completo' : 'Vedi Piani'}
              </button>
            </div>
          </section>
        )}

        {/* Metrics KPI Strip */}
        <MetricsStrip
          metrics={metrics}
          plan={activePlan}
          limit={clientLimit}
          onOpenReminders={() => setActiveTab('reminders')}
        />

        {/* Filter & Search Bar for Clients View */}
        {activeTab === 'all' && (
          <section aria-label="Ricerca e filtri clienti" className="space-y-2.5">
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <div className="relative sm:col-span-2">
                  <Search
                    className="w-4 h-4 absolute left-3 top-2.5 text-[#5a808a]"
                    aria-hidden="true"
                  />
                  <label htmlFor="search-input" className="sr-only">
                    Cerca cliente, telefono, zona, indirizzo o etichetta
                  </label>
                  <input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca cliente, zona, etichetta..."
                    className="w-full bg-white border border-[#cbe2de] rounded-lg pl-9 pr-4 py-2 text-sm text-[#0f3b47] placeholder-[#6c8f98] focus:outline-none focus:border-[#2eb086]"
                  />
                </div>

                <div>
                  <label htmlFor="filter-status" className="sr-only">
                    Filtra per esito
                  </label>
                  <select
                    id="filter-status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-sm text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                  >
                    <option value="ALL">Tutti gli Esiti</option>
                    <option value="In corso">In corso</option>
                    <option value="Trattativa">Trattativa</option>
                    <option value="Accettato">Accettato (Chiuso)</option>
                    <option value="Perso">Perso</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="filter-role" className="sr-only">
                    Filtra per ruolo
                  </label>
                  <select
                    id="filter-role"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-sm text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                  >
                    <option value="ALL">Tutti i Ruoli</option>
                    <option value="Acquirente">Acquirente</option>
                    <option value="Venditore">Venditore</option>
                    <option value="Inquilino">Inquilino</option>
                    <option value="Locatore">Locatore (Proprietario)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="filter-tag" className="sr-only">
                    Filtra per etichetta
                  </label>
                  <select
                    id="filter-tag"
                    value={activeTagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-sm text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                  >
                    <option value="ALL">Tutte le Etichette</option>
                    {availableTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="sort-select" className="sr-only">
                    Ordina clienti
                  </label>
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-sm text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                  >
                    <option value="default">Ordine predefinito</option>
                    <option value="name-asc">Nome (A-Z)</option>
                    <option value="price-desc">Prezzo (Decrescente)</option>
                    <option value="price-asc">Prezzo (Crescente)</option>
                    <option value="reminder-asc">Prossimo Richiamo</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 text-xs text-[#4a707a]">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 bg-white border border-[#cbe2de] rounded-lg px-2.5 py-1">
                    <Euro className="w-3.5 h-3.5 text-[#0e4d5f] shrink-0" aria-hidden="true" />
                    <span className="font-semibold text-[#0e4d5f] whitespace-nowrap">Budget</span>
                    <label htmlFor="filter-budget-min" className="sr-only">
                      Budget minimo in Euro
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
                      placeholder="Da €"
                      className="w-24 sm:w-28 bg-[#f4faf9] border border-[#dbeae7] rounded px-2 py-1 text-xs text-[#0f3b47] placeholder-[#6c8f98] font-mono tabular-nums focus:outline-none focus:border-[#2eb086]"
                    />
                    <span aria-hidden="true" className="text-[#6c8f98]">
                      –
                    </span>
                    <label htmlFor="filter-budget-max" className="sr-only">
                      Budget massimo in Euro
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
                      placeholder="A €"
                      className="w-24 sm:w-28 bg-[#f4faf9] border border-[#dbeae7] rounded px-2 py-1 text-xs text-[#0f3b47] placeholder-[#6c8f98] font-mono tabular-nums focus:outline-none focus:border-[#2eb086]"
                    />
                  </div>

                  <span data-testid="results-count" className="px-0.5 tabular-nums">
                    {filteredClients.length === visiblePool.length
                      ? `${visiblePool.length} clienti attivi${
                          clients.length > visiblePool.length
                            ? ` (su ${clients.length} in archivio)`
                            : ''
                        }`
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
                    <span>Solo con Foto</span>
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
                    <span>Solo Preferiti</span>
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
                      Azzera filtri
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CONTENT VIEWS */}
        {activeTab === 'all' && (
          <section aria-label="Elenco clienti">
            {filteredClients.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[#cbe2de] bg-white rounded-xl space-y-3">
                <FolderOpen className="w-10 h-10 text-[#8bb3bd] mx-auto" aria-hidden="true" />
                <h2 className="text-base font-bold text-[#0e4d5f]">
                  Nessun cliente presente o trovato
                </h2>
                <p className="text-xs text-[#5a808a] max-w-sm mx-auto">
                  Puoi aggiungere un nuovo cliente, modificare i filtri oppure caricare le schede
                  demo di prova.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="px-4 py-2 rounded-lg bg-white border border-[#cbe2de] hover:bg-[#f0f7f6] text-[#0e4d5f] text-xs font-semibold"
                    >
                      Azzera Filtri
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLoad50Demo}
                    className="px-4 py-2 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold"
                  >
                    Carica 50 Clienti Demo
                  </button>
                  <button
                    type="button"
                    onClick={openNewClientModal}
                    className="px-4 py-2 rounded-lg bg-[#177858] hover:bg-[#125f46] text-white text-xs font-semibold"
                  >
                    + Nuovo Cliente
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
      </main>

      {/* MOBILE BOTTOM NAVBAR */}
      <nav
        aria-label="Navigazione mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-[#cbe2de] px-1 py-1 flex justify-around items-center"
      >
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex flex-col items-center px-2 py-1.5 text-xs ${
            activeTab === 'all' ? 'text-[#0e4d5f] font-semibold' : 'text-[#5a808a]'
          }`}
        >
          <Users className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] mt-0.5">Clienti</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center px-2 py-1.5 text-xs ${
            activeTab === 'dashboard' ? 'text-[#0e4d5f] font-semibold' : 'text-[#5a808a]'
          }`}
        >
          <BarChart3 className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] mt-0.5">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reminders')}
          className={`relative flex flex-col items-center px-2 py-1.5 text-xs ${
            activeTab === 'reminders' ? 'text-[#0e4d5f] font-semibold' : 'text-[#5a808a]'
          }`}
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] mt-0.5">
            Scadenze{metrics.remindersDue > 0 ? ` (${metrics.remindersDue})` : ''}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matching')}
          className={`flex flex-col items-center px-2 py-1.5 text-xs ${
            activeTab === 'matching' ? 'text-[#0e4d5f] font-semibold' : 'text-[#5a808a]'
          }`}
        >
          <GitCompare className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] mt-0.5">Matching</span>
        </button>

        <button
          type="button"
          onClick={openNewClientModal}
          className="flex flex-col items-center px-2 py-1.5 text-[#177858] font-semibold"
        >
          <PlusCircle className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] mt-0.5">Nuovo</span>
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
            `Il backup contiene ${count} schede, ma il tuo piano attuale consente massimo ${clientLimit} clienti. Passa a Basic o Completo per importarlo.`,
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
        onClose={() => setPlansModalOpen(false)}
        onRequireAuthForPlan={(plan) => {
          setPendingPlanAfterAuth(plan);
          setPlansModalOpen(false);
          handleOpenAuth(
            'register',
            'Per attivare un piano a pagamento accedi o registrati gratuitamente.',
          );
        }}
        onConfirmPayment={handleConfirmPlanPayment}
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
            'Attiva il Piano Azienda (€ 59,00 / anno) per collegare tutti i dispositivi e gli agenti in tempo reale.',
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

      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />

      <OfflineIndicator />

      {/* TOAST NOTIFICATIONS */}
      <div
        aria-live="polite"
        className="fixed bottom-20 md:bottom-5 right-4 z-[70] flex flex-col gap-2 pointer-events-none"
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
