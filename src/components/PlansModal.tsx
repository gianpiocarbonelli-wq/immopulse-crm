import { type FormEvent, useEffect, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  Crown,
  ExternalLink,
  KeyRound,
  Lock,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wifi,
  X,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type {
  BillingCycle,
  PaidPlanTier,
  PlanTier,
  SubscriptionStatus,
  UserAccount,
} from '../types/crm';
import {
  formatPrice,
  STRIPE_ANNUAL_CHECKOUT_URL,
  STRIPE_CUSTOMER_PORTAL_URL,
  STRIPE_MONTHLY_CHECKOUT_URL,
  STRIPE_PRO_CHECKOUT_URL,
  SUBSCRIPTION_CONFIG,
} from '../utils/legalAndSupport';

export interface LicenseVerifyCallbackResult {
  ok: boolean;
  message: string;
}

interface PlansModalProps {
  isOpen: boolean;
  contextMessage: string;
  currentUser: UserAccount | null;
  activePlan: PlanTier;
  preselectedPlan: PaidPlanTier | null;
  subscriptionStatus?: SubscriptionStatus;
  savedLicenseCode?: string | null;
  onClose: () => void;
  onRequireAuthForPlan: (plan: PaidPlanTier) => void;
  onConfirmPayment: (plan: PaidPlanTier, paymentLabel: string, billingCycle: BillingCycle) => void;
  onVerifyLicenseCode: (code: string) => LicenseVerifyCallbackResult;
}

export function PlansModal({
  isOpen,
  contextMessage,
  currentUser,
  activePlan,
  preselectedPlan,
  subscriptionStatus,
  savedLicenseCode,
  onClose,
  onVerifyLicenseCode,
}: PlansModalProps) {
  const { lang, locale } = useLanguage();
  const isEn = lang === 'en';
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseFeedback, setLicenseFeedback] = useState<LicenseVerifyCallbackResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLicenseInput(savedLicenseCode || currentUser?.licenseCode || '');
    setLicenseFeedback(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, savedLicenseCode, currentUser?.licenseCode, onClose]);

  if (!isOpen) return null;

  const formattedExpiry = subscriptionStatus?.expiresAt
    ? new Date(subscriptionStatus.expiresAt).toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  const isExpiringSoon = subscriptionStatus?.phase === 'expiring_soon';
  const activeProMonthly = activePlan === 'pro' && subscriptionStatus?.billingCycle !== 'annual';
  const activeProAnnual = activePlan === 'pro' && subscriptionStatus?.billingCycle === 'annual';
  const activeAgency = activePlan === 'agency';
  const daysSuffix = isEn ? 'd' : 'gg';
  const activeLicense = savedLicenseCode || currentUser?.licenseCode || null;

  const handleVerifyLicense = (e: FormEvent) => {
    e.preventDefault();
    const res = onVerifyLicenseCode(licenseInput);
    setLicenseFeedback(res);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plans-modal-title"
      data-testid="plans-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-[#092b35]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-backdrop"
    >
      <div className="bg-white border border-[#cbe2de] w-full max-w-6xl rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl sm:my-auto flex flex-col max-h-[92vh] animate-bottom-sheet">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#e1f0ed] flex items-center justify-between bg-[#f4faf9] sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <Crown className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />
            <div>
              <h2 id="plans-modal-title" className="font-bold text-base text-[#0e4d5f]">
                {isEn ? 'Subscriptions & Licenses' : 'Abbonamenti e Licenze'}
              </h2>
              <p className="text-[11px] text-[#4a707a]">
                {isEn
                  ? 'Choose the ImmoPulse license that fits your agency workflow.'
                  : 'Scegli la licenza ImmoPulse più adatta alla tua operatività immobiliare.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? 'Close subscriptions modal' : 'Chiudi finestra abbonamenti e licenze'}
            className="p-1.5 rounded-lg text-[#5a808a] hover:text-[#0e4d5f]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {contextMessage && (
            <p className="text-xs bg-amber-50 text-amber-900 border border-amber-200 rounded-xl p-3">
              {contextMessage}
            </p>
          )}

          {/* Subtle Current Status Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f7fbfb] border border-[#dceceb] rounded-xl px-4 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-[#0e4d5f]">
              <span className="font-semibold text-[#4a707a]">
                {isEn ? 'Current plan:' : 'Stato attuale:'}
              </span>
              <span className="font-bold">
                {activeAgency
                  ? isEn
                    ? 'ImmoPulse Agency Pro License'
                    : 'Licenza Agenzia ImmoPulse Pro'
                  : activeProAnnual
                    ? isEn
                      ? 'ImmoPulse Agent Pro License'
                      : 'Licenza Agente ImmoPulse Pro'
                    : activeProMonthly
                      ? isEn
                        ? 'ImmoPulse License (Monthly)'
                        : 'Licenza ImmoPulse (Mensile)'
                      : isEn
                        ? 'Guest / Free (up to 3 active clients)'
                        : 'Ospite / Free (max 3 clienti attivi)'}
              </span>
              {activeLicense && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e2f5ee] text-[#177858] font-mono text-[11px] font-semibold">
                  <KeyRound className="w-3 h-3" aria-hidden="true" />
                  {activeLicense}
                </span>
              )}
            </div>
            {formattedExpiry && activePlan !== 'free' && (
              <span className="text-[11px] font-medium text-[#4a707a]">
                {isExpiringSoon
                  ? isEn
                    ? `Expiring ${formattedExpiry} (${subscriptionStatus?.daysRemaining}${daysSuffix})`
                    : `In scadenza il ${formattedExpiry} (${subscriptionStatus?.daysRemaining}${daysSuffix})`
                  : isEn
                    ? `Valid until ${formattedExpiry}`
                    : `Attivo fino al ${formattedExpiry}`}
              </span>
            )}
          </div>

          {/* 3 Side-by-Side Subscription & License Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch pt-1">
            {/* 1. PIANO MENSILE — Licenza ImmoPulse */}
            <div
              data-testid="plan-card-monthly"
              className="border border-[#cbe2de] rounded-2xl p-5 bg-[#f9fcfc] flex flex-col justify-between space-y-5 shadow-2xs hover:border-[#9fd4c5] transition-colors"
            >
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-[#177858] uppercase tracking-wider">
                  {isEn ? 'MONTHLY PLAN' : 'PIANO MENSILE'}
                </div>
                <h3 className="text-base font-bold text-[#0e4d5f]">
                  {isEn ? 'ImmoPulse License' : 'Licenza ImmoPulse'}
                </h3>
                <div className="text-3xl font-bold text-[#0e4d5f] font-mono tabular-nums" data-testid="plan-price-monthly">
                  {formatPrice(SUBSCRIPTION_CONFIG.plans.monthly.priceEUR)}{' '}
                  <span className="text-xs font-sans font-normal text-[#5a808a]">
                    / {isEn ? 'month' : 'mese'}
                  </span>
                </div>
                <p className="text-xs text-[#4a707a] leading-relaxed">
                  {isEn
                    ? 'Full monthly access with no annual commitment.'
                    : 'Accesso completo mensile senza vincoli annuali.'}
                </p>
                <ul className="text-xs space-y-2.5 text-[#3b5e68] pt-2 border-t border-[#e5f1ef]">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      <strong>{isEn ? 'Unlimited clients' : 'Clienti illimitati'}</strong>{' '}
                      {isEn ? '& up to 7 photos per card' : 'e fino a 7 foto per scheda'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      {isEn ? 'Call, WhatsApp, Email & Maps' : 'Chiama, WhatsApp, Email e Maps'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      {isEn
                        ? 'PDF Export, +50 Demo, Matching & Backup'
                        : 'Export PDF, +50 Demo, Matching e Backup'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 pt-1">
                {activeProMonthly && !isExpiringSoon ? (
                  <button
                    type="button"
                    disabled
                    data-testid="select-plan-monthly"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-200 text-slate-600 cursor-not-allowed"
                  >
                    {isEn ? 'Current Plan' : 'Piano Attuale'}
                  </button>
                ) : (
                  <a
                    href={STRIPE_MONTHLY_CHECKOUT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="select-plan-monthly"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all active:scale-95 bg-[#177858] hover:bg-[#125f46] text-white inline-flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span>
                      {isEn ? 'Activate Monthly' : 'Attiva Mensile'}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>

            {/* 2. PIANO CONSIGLIATO — Licenza Agente ImmoPulse Pro */}
            <div
              data-testid="plan-card-annual"
              className="relative border-2 border-[#2eb086] ring-2 ring-[#2eb086]/15 rounded-2xl p-5 bg-[#f4fbf9] flex flex-col justify-between space-y-5 shadow-md"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#177858] uppercase tracking-wider inline-flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#2eb086]" aria-hidden="true" />
                    {isEn ? 'RECOMMENDED PLAN' : 'PIANO CONSIGLIATO'}
                  </span>
                  <span
                    data-testid="badge-most-popular"
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#177858] text-white shadow-2xs tracking-wide"
                  >
                    {isEn ? 'MOST POPULAR' : 'PIÙ SCELTO'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0e4d5f]">
                  {isEn ? 'ImmoPulse Agent Pro License' : 'Licenza Agente ImmoPulse Pro'}
                </h3>
                <div className="text-3xl font-bold text-[#0e4d5f] font-mono tabular-nums" data-testid="plan-price-annual">
                  {formatPrice(SUBSCRIPTION_CONFIG.plans.annual.priceEUR)}{' '}
                  <span className="text-xs font-sans font-normal text-[#5a808a]">
                    / {isEn ? 'year' : 'anno'}
                  </span>
                </div>
                <p className="text-xs text-[#3b5e68] leading-relaxed">
                  {isEn
                    ? 'Ideal for solo real estate agents. Save over € 104 compared to the monthly plan.'
                    : 'Ideale per singoli agenti immobiliari. Risparmi oltre 104 € rispetto al piano mensile.'}
                </p>
                <ul className="text-xs space-y-2.5 text-[#25454e] pt-2 border-t border-[#cbe2de]">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#177858] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      <strong>{isEn ? 'All Pro features' : 'Tutte le funzioni Pro'}</strong>{' '}
                      {isEn ? 'for 12 full months' : 'per 12 mesi completi'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#177858] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      {isEn
                        ? 'Unlimited clients, WhatsApp, Maps & PDF'
                        : 'Clienti illimitati, WhatsApp, Maps e PDF'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#177858] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      {isEn
                        ? 'Smart Matching, +50 Demo & JSON Backup'
                        : 'Matching intelligente, +50 Demo e Backup JSON'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 pt-1">
                {activeProAnnual && !isExpiringSoon ? (
                  <button
                    type="button"
                    disabled
                    data-testid="select-plan-annual"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-200 text-slate-600 cursor-not-allowed"
                  >
                    {isEn ? 'Current Plan' : 'Piano Attuale'}
                  </button>
                ) : (
                  <a
                    href={STRIPE_ANNUAL_CHECKOUT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="select-plan-annual"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 bg-[#177858] hover:bg-[#125f46] text-white inline-flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>
                      {isEn ? 'Activate Agent Pro' : 'Attiva Agente Pro'}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>

            {/* 3. PIANO AGENZIA — Licenza Agenzia ImmoPulse Pro */}
            <div
              data-testid="plan-card-agency"
              className={`border-2 rounded-2xl p-5 bg-gradient-to-b from-[#0e4d5f]/5 to-white flex flex-col justify-between space-y-5 shadow-sm transition-colors ${
                preselectedPlan === 'agency' ? 'border-[#0e4d5f] ring-2 ring-[#0e4d5f]/15' : 'border-[#0e4d5f]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#0e4d5f] uppercase tracking-wider inline-flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#0e4d5f]" aria-hidden="true" />
                    {isEn ? 'AGENCY PLAN' : 'PIANO AGENZIA'}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#0e4d5f] text-white">
                    {isEn ? 'Multi-Seat' : 'Multi-Postazione'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0e4d5f]">
                  {isEn ? 'ImmoPulse Agency Pro License' : 'Licenza Agenzia ImmoPulse Pro'}
                </h3>
                <div className="text-3xl font-bold text-[#0e4d5f] font-mono tabular-nums" data-testid="plan-price-agency">
                  {formatPrice(SUBSCRIPTION_CONFIG.plans.agency.priceEUR)}{' '}
                  <span className="text-xs font-sans font-normal text-[#5a808a]">
                    / {isEn ? 'year' : 'anno'}
                  </span>
                </div>
                <p className="text-xs text-[#3b5e68] leading-relaxed">
                  {isEn
                    ? 'Designed for real estate teams and agencies with complete operations.'
                    : 'Pensato per team e agenzie immobiliari con operatività completa.'}
                </p>
                <ul className="text-xs space-y-2.5 text-[#25454e] pt-2 border-t border-[#dceceb]">
                  <li className="flex items-start gap-2">
                    <Wifi className="w-3.5 h-3.5 text-[#177858] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      <strong>{isEn ? 'Real-time cloud sync' : 'Sync cloud in tempo reale'}</strong>{' '}
                      {isEn ? 'across team devices' : 'tra i dispositivi del team'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      {isEn
                        ? 'Shared agency code & online agents roster'
                        : 'Codice agenzia condiviso e lista agenti online'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      {isEn
                        ? 'AI Chatbot, portal search & unlimited archive'
                        : 'Chatbot AI, ricerca portali e archivio illimitato'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 pt-1">
                {activeAgency && !isExpiringSoon ? (
                  <button
                    type="button"
                    disabled
                    data-testid="select-plan-agency"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-200 text-slate-600 cursor-not-allowed"
                  >
                    {isEn ? 'Current Plan' : 'Piano Attuale'}
                  </button>
                ) : (
                  <a
                    href={STRIPE_PRO_CHECKOUT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="select-plan-agency"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 bg-[#0e4d5f] hover:bg-[#093845] text-white inline-flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span>
                      {isEn ? 'Activate Agency Pro' : 'Attiva Agenzia Pro'}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Informative Stripe Note */}
          <div
            data-testid="stripe-info-note"
            className="flex items-start sm:items-center gap-2.5 bg-[#f4faf9] border border-[#cbe2de] rounded-xl px-4 py-3 text-xs text-[#3b5e68]"
          >
            <ShieldCheck className="w-4 h-4 text-[#177858] shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <p className="leading-relaxed">
              {isEn
                ? 'Secure payments processed via Stripe — Fixed Euro (EUR €) pricing without automatic local currency conversion.'
                : 'Pagamenti sicuri gestiti tramite Stripe — Prezzi fissi in Euro (EUR €), nessuna conversione automatica in valuta locale.'}
            </p>
          </div>

          {/* Discreet License Code Unlock Field */}
          <form
            onSubmit={handleVerifyLicense}
            data-testid="license-code-form"
            className="bg-[#f9fcfc] border border-[#dceceb] rounded-xl p-4 space-y-2.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <label
                htmlFor="license-code-input"
                className="text-xs font-semibold text-[#0e4d5f] inline-flex items-center gap-1.5 shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#2eb086]" aria-hidden="true" />
                <span>
                  {isEn
                    ? 'Already have a license code? Enter it here'
                    : 'Hai già un codice licenza? Inseriscilo qui'}
                </span>
              </label>
              <div className="flex flex-1 items-center gap-2">
                <input
                  id="license-code-input"
                  data-testid="license-code-input"
                  type="text"
                  value={licenseInput}
                  onChange={(e) => {
                    setLicenseInput(e.target.value);
                    if (licenseFeedback) setLicenseFeedback(null);
                  }}
                  placeholder={isEn ? 'e.g. IMMOPULSE2026' : 'es. IMMOPULSE2026'}
                  className="flex-1 min-w-0 bg-white border border-[#cbe2de] rounded-lg px-3 py-1.5 text-xs font-mono uppercase text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                />
                <button
                  type="submit"
                  data-testid="verify-license-btn"
                  className="px-4 py-1.5 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold whitespace-nowrap transition-colors shrink-0"
                >
                  {isEn ? 'Activate Code' : 'Attiva Codice'}
                </button>
              </div>
            </div>

            {licenseFeedback && (
              <div
                role={licenseFeedback.ok ? 'status' : 'alert'}
                data-testid="license-verify-feedback"
                className={`text-xs font-medium rounded-lg px-3 py-2 flex items-center gap-2 ${
                  licenseFeedback.ok
                    ? 'bg-[#eefaf6] border border-[#2eb086]/40 text-[#177858]'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {licenseFeedback.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                ) : (
                  <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                <span>{licenseFeedback.message}</span>
              </div>
            )}
          </form>

          {/* Stripe Customer Portal — Subscription & Invoices Management */}
          <div className="bg-[#f4faf9] border border-[#cbe2de] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-lg bg-white border border-[#cbe2de] text-[#0e4d5f] shrink-0">
                <Receipt className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="text-xs space-y-0.5">
                <div className="font-bold text-[#0e4d5f]">
                  {isEn
                    ? 'Stripe Billing & Auto-Renewal Portal'
                    : 'Area Fatturazione e Rinnovo Automatico Stripe'}
                </div>
                <p className="text-[#4a707a]">
                  {isEn
                    ? 'Download receipts and invoices, update your payment card, or cancel anytime on your own.'
                    : 'Scarica ricevute e fatture, aggiorna la carta o gestisci la disdetta in completa autonomia.'}
                </p>
              </div>
            </div>
            <a
              href={STRIPE_CUSTOMER_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="stripe-portal-btn"
              className="px-4 py-2 rounded-lg bg-white hover:bg-[#eef6f5] text-[#0e4d5f] border border-[#0e4d5f]/40 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors shrink-0"
            >
              <span>
                {isEn ? 'Manage Subscription / Invoices' : 'Gestisci Abbonamento / Fatture'}
              </span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
