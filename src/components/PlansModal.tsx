import { type FormEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, Building2, Check, Crown, Wifi, X } from 'lucide-react';
import type { PaidPlanTier, PaymentMethodType, PlanTier, UserAccount } from '../types/crm';
import { validateCardPayment, validateDigitalPayment } from '../utils/crmLogic';

interface PlansModalProps {
  isOpen: boolean;
  contextMessage: string;
  currentUser: UserAccount | null;
  activePlan: PlanTier;
  preselectedPlan: PaidPlanTier | null;
  onClose: () => void;
  onRequireAuthForPlan: (plan: PaidPlanTier) => void;
  onConfirmPayment: (plan: PaidPlanTier, paymentLabel: string) => void;
}

export function PlansModal({
  isOpen,
  contextMessage,
  currentUser,
  activePlan,
  preselectedPlan,
  onClose,
  onRequireAuthForPlan,
  onConfirmPayment,
}: PlansModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PaidPlanTier | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('digital');
  const [digitalProvider, setDigitalProvider] = useState('PayPal');
  const [digitalAccount, setDigitalAccount] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkoutRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setSelectedPlan(preselectedPlan && currentUser ? preselectedPlan : null);
    setPaymentMethod('digital');
    setDigitalProvider('PayPal');
    setDigitalAccount('');
    setCardHolder('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
  }, [isOpen, preselectedPlan, currentUser]);

  useEffect(() => {
    if (selectedPlan && checkoutRef.current) {
      try {
        checkoutRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch {
        // Ignore smooth scroll fallback issues
      }
    }
  }, [selectedPlan]);

  if (!isOpen) return null;

  const methodNote = currentUser?.paymentMethod ? ` (${currentUser.paymentMethod})` : '';

  const handleSelectPlan = (planKey: PaidPlanTier) => {
    setErrorMsg(null);
    if (!currentUser) {
      onRequireAuthForPlan(planKey);
      return;
    }
    setSelectedPlan(planKey);
  };

  const formatCardNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    setCardNumber(digits.replace(/(\d{4})(?=\d)/g, '$1 '));
  };

  const formatExpiry = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  const handleSubmitPayment = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedPlan) return;
    setErrorMsg(null);

    let paymentLabel = '';
    if (paymentMethod === 'digital') {
      const err = validateDigitalPayment(digitalProvider, digitalAccount);
      if (err) {
        setErrorMsg(err);
        return;
      }
      paymentLabel = digitalProvider;
    } else {
      const err = validateCardPayment(cardHolder, cardNumber, cardExpiry, cardCvv);
      if (err) {
        setErrorMsg(err);
        return;
      }
      paymentLabel = paymentMethod === 'prepaid' ? 'Carta Prepagata' : 'Carta di Credito/Debito';
    }

    onConfirmPayment(selectedPlan, paymentLabel);
  };

  const selectedPlanSummary =
    selectedPlan === 'basic'
      ? 'Piano Basic — € 14,99 / mese (Max 10 clienti + WhatsApp e Mappa)'
      : selectedPlan === 'full'
        ? 'Piano Completo Illimitato — € 24,99 / mese (Clienti e funzioni illimitate)'
        : 'Piano Azienda Multi-Dispositivo — € 59,00 / anno (Tutti i dispositivi e agenti collegati in tempo reale + clienti illimitati)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plans-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-[#092b35]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white border border-[#cbe2de] w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-[#e1f0ed] flex items-center justify-between bg-[#f4faf9] sticky top-0 z-10">
          <h2 id="plans-modal-title" className="font-bold text-base text-[#0e4d5f] flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" aria-hidden="true" /> Piani Tariffari e Pagamento
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra piani"
            className="p-1.5 rounded-lg text-[#5a808a] hover:text-[#0e4d5f]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
          {contextMessage && (
            <p className="text-xs bg-amber-50 text-amber-900 border border-amber-200 rounded-lg p-3">
              {contextMessage}
            </p>
          )}

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
            {/* Free */}
            <div className="border border-[#cbe2de] rounded-xl p-4 bg-[#f9fcfc] flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#4a707a] uppercase tracking-wider">Ospite / Free</div>
                <div className="text-2xl font-bold text-[#0e4d5f] font-mono tabular-nums">
                  € 0 <span className="text-xs font-sans font-normal text-[#5a808a]">/ mese</span>
                </div>
                <p className="text-xs text-[#4a707a]">Per provare l&apos;agenda senza abbonamento.</p>
                <ul className="text-xs space-y-2 text-[#3b5e68] pt-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0" aria-hidden="true" /> Massimo 3 clienti attivi
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0" aria-hidden="true" /> Solo Chiama ed Email
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0" aria-hidden="true" /> Fino a 7 foto per cliente
                  </li>
                  <li className="flex items-center gap-2 text-rose-700">
                    <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> Niente WhatsApp e Mappa
                  </li>
                </ul>
              </div>
              <div className="text-center text-xs font-semibold text-[#5a808a] py-2 rounded-lg bg-slate-100">
                {activePlan === 'free' ? 'Piano Attuale' : 'Piano Base'}
              </div>
            </div>

            {/* Basic */}
            <div className="border border-[#0e4d5f]/40 rounded-xl p-4 bg-white flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#0e4d5f] uppercase tracking-wider">Basic</div>
                <div className="text-2xl font-bold text-[#0e4d5f] font-mono tabular-nums">
                  € 14,99 <span className="text-xs font-sans font-normal text-[#5a808a]">/ mese</span>
                </div>
                <p className="text-xs text-[#4a707a]">Per agenti indipendenti con portafoglio snello.</p>
                <ul className="text-xs space-y-2 text-[#3b5e68] pt-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0" aria-hidden="true" /> Fino a <strong>10 clienti</strong> attivi
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0" aria-hidden="true" /> Chiama, WhatsApp, Email, Mappa
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0" aria-hidden="true" /> Fino a 7 foto per cliente
                  </li>
                  <li className="flex items-center gap-2 text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> Limite massimo 10 clienti
                  </li>
                </ul>
              </div>
              <button
                type="button"
                disabled={activePlan === 'basic'}
                onClick={() => handleSelectPlan('basic')}
                className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  activePlan === 'basic'
                    ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                    : 'bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white'
                }`}
              >
                {activePlan === 'basic' ? `Piano Attuale${methodNote}` : 'Scegli Basic (€ 14,99)'}
              </button>
            </div>

            {/* Full */}
            <div className="border-2 border-[#2eb086] rounded-xl p-4 bg-[#f4fbf9] flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#177858] uppercase tracking-wider">
                    Completo
                  </span>
                  <span className="text-[11px] font-bold text-[#177858]">Singolo</span>
                </div>
                <div className="text-2xl font-bold text-[#0e4d5f] font-mono tabular-nums">
                  € 24,99 <span className="text-xs font-sans font-normal text-[#5a808a]">/ mese</span>
                </div>
                <p className="text-xs text-[#4a707a]">Per consulenti individuali ad alto volume.</p>
                <ul className="text-xs space-y-2 text-[#3b5e68] pt-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0" aria-hidden="true" /> <strong>Clienti illimitati</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0" aria-hidden="true" /> Chiama, WhatsApp, Email, Mappa
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0" aria-hidden="true" /> Fino a 7 foto &amp; Export PDF
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0" aria-hidden="true" /> +50 Demo, Matching e Backup
                  </li>
                </ul>
              </div>
              <button
                type="button"
                disabled={activePlan === 'full'}
                onClick={() => handleSelectPlan('full')}
                className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  activePlan === 'full'
                    ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                    : 'bg-[#177858] hover:bg-[#125f46] text-white'
                }`}
              >
                {activePlan === 'full' ? `Piano Attuale${methodNote}` : 'Scegli Completo (€ 24,99)'}
              </button>
            </div>

            {/* Agency Multi-Device Annual Plan (€ 59,00 / anno) */}
            <div
              data-testid="plan-card-agency"
              className="border-2 border-[#0e4d5f] rounded-xl p-4 bg-gradient-to-b from-[#0e4d5f]/5 to-white flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#0e4d5f] uppercase tracking-wider inline-flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#0e4d5f]" aria-hidden="true" />
                    Azienda
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#0e4d5f] text-white">
                    Multi-Dispositivo
                  </span>
                </div>
                <div className="text-2xl font-bold text-[#0e4d5f] font-mono tabular-nums">
                  € 59,00 <span className="text-xs font-sans font-normal text-[#5a808a]">/ anno</span>
                </div>
                <p className="text-xs text-[#3b5e68]">
                  Collega tutti i dispositivi e gli agenti della tua agenzia in tempo reale.
                </p>
                <ul className="text-xs space-y-2 text-[#25454e] pt-2">
                  <li className="flex items-start gap-2">
                    <Wifi className="w-3.5 h-3.5 text-[#177858] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      <strong>Sync in tempo reale</strong> tra PC, tablet e smartphone del team
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      <strong>Codice Agenzia condiviso</strong> con lista agenti online
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      <strong>Clienti e funzioni illimitate</strong> incluse (PDF, Matching, WhatsApp)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2eb086] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Fatturazione annuale unica per tutta l&apos;agenzia</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                data-testid="select-plan-agency"
                disabled={activePlan === 'agency'}
                onClick={() => handleSelectPlan('agency')}
                className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  activePlan === 'agency'
                    ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                    : 'bg-[#0e4d5f] hover:bg-[#093845] text-white'
                }`}
              >
                {activePlan === 'agency' ? `Piano Attuale${methodNote}` : 'Scegli Azienda (€ 59/anno)'}
              </button>
            </div>
          </div>

          {/* Checkout Form */}
          {selectedPlan && (
            <form
              ref={checkoutRef}
              onSubmit={handleSubmitPayment}
              className="border-t border-[#cbe2de] pt-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f4faf9] border border-[#cbe2de] rounded-xl p-3.5">
                <div>
                  <div className="text-xs text-[#4a707a]">Piano selezionato</div>
                  <div className="font-bold text-[#0e4d5f] text-sm">{selectedPlanSummary}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="text-xs text-[#5a808a] hover:text-[#0e4d5f] underline"
                >
                  Cambia piano
                </button>
              </div>

              {errorMsg && (
                <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-[#0e4d5f]">
                  Seleziona Modalità di Pagamento *
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      {
                        value: 'digital',
                        title: 'PayPal / Satispay / Bancomat Pay',
                        desc: 'Pagamento digitale rapido',
                      },
                      {
                        value: 'card',
                        title: 'Carta di Credito / Debito',
                        desc: 'Visa, Mastercard, Amex',
                      },
                      {
                        value: 'prepaid',
                        title: 'Carta Prepagata',
                        desc: 'Postepay e ricaricabili',
                      },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className={`cursor-pointer rounded-xl p-3 flex items-start gap-2 transition-colors ${
                        paymentMethod === opt.value
                          ? 'border-2 border-[#2eb086] bg-[#eefaf6]'
                          : 'border border-[#cbe2de] bg-[#f4faf9]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value={opt.value}
                        checked={paymentMethod === opt.value}
                        onChange={() => {
                          setPaymentMethod(opt.value);
                          setErrorMsg(null);
                        }}
                        className="mt-0.5 accent-[#2eb086]"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-[#0e4d5f]">{opt.title}</div>
                        <div className="text-[11px] text-[#5a808a]">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>

              {paymentMethod === 'digital' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#f9fcfc] p-4 rounded-xl border border-[#dceceb]">
                  <div>
                    <label htmlFor="pay-digital-provider" className="block text-xs text-[#3b5e68] mb-1">
                      Servizio *
                    </label>
                    <select
                      id="pay-digital-provider"
                      value={digitalProvider}
                      onChange={(e) => setDigitalProvider(e.target.value)}
                      className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                    >
                      <option value="PayPal">PayPal</option>
                      <option value="Satispay">Satispay</option>
                      <option value="Bancomat Pay">Bancomat Pay</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pay-digital-account" className="block text-xs text-[#3b5e68] mb-1">
                      {digitalProvider === 'PayPal'
                        ? 'Email Account PayPal *'
                        : `Numero Cellulare ${digitalProvider} *`}
                    </label>
                    <input
                      id="pay-digital-account"
                      type="text"
                      value={digitalAccount}
                      onChange={(e) => setDigitalAccount(e.target.value)}
                      placeholder={digitalProvider === 'PayPal' ? 'es. mario@email.it' : 'es. 3391234567'}
                      className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#f9fcfc] p-4 rounded-xl border border-[#dceceb]">
                  <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#0e4d5f]">
                      {paymentMethod === 'prepaid'
                        ? 'Dati Carta Prepagata (Postepay / Ricaricabile)'
                        : 'Dati Carta di Credito o Debito (Visa, Mastercard, American Express)'}
                    </span>
                    <span className="text-[11px] text-[#5a808a]">Transazione simulata locale</span>
                  </div>
                  <div>
                    <label htmlFor="pay-card-holder" className="block text-xs text-[#3b5e68] mb-1">
                      Intestatario Carta *
                    </label>
                    <input
                      id="pay-card-holder"
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Es. Marco Rossi"
                      className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
                    />
                  </div>
                  <div>
                    <label htmlFor="pay-card-number" className="block text-xs text-[#3b5e68] mb-1">
                      Numero Carta *
                    </label>
                    <input
                      id="pay-card-number"
                      type="text"
                      maxLength={19}
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => formatCardNumber(e.target.value)}
                      placeholder="4023 6000 1234 5678"
                      className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] font-mono tabular-nums focus:outline-none focus:border-[#2eb086]"
                    />
                  </div>
                  <div>
                    <label htmlFor="pay-card-expiry" className="block text-xs text-[#3b5e68] mb-1">
                      Scadenza (MM/AA) *
                    </label>
                    <input
                      id="pay-card-expiry"
                      type="text"
                      maxLength={5}
                      inputMode="numeric"
                      value={cardExpiry}
                      onChange={(e) => formatExpiry(e.target.value)}
                      placeholder="12/28"
                      className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] font-mono tabular-nums focus:outline-none focus:border-[#2eb086]"
                    />
                  </div>
                  <div>
                    <label htmlFor="pay-card-cvv" className="block text-xs text-[#3b5e68] mb-1">
                      CVV / CVC *
                    </label>
                    <input
                      id="pay-card-cvv"
                      type="password"
                      maxLength={4}
                      inputMode="numeric"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      className="w-full bg-white border border-[#cbe2de] rounded-lg px-3 py-2 text-[#0f3b47] font-mono tabular-nums focus:outline-none focus:border-[#2eb086]"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="px-4 py-2 rounded-lg bg-[#eef6f5] text-[#3b5e68] text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold"
                >
                  Conferma Pagamento e Attiva Piano
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
