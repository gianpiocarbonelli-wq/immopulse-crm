import { Check, GitCompare, MessageSquare, Phone } from 'lucide-react';
import type { ClientRecord } from '../types/crm';
import { buildWhatsAppUrl, computeMatches, formatCurrencyEUR } from '../utils/crmLogic';

interface MatchingViewProps {
  pool: ClientRecord[];
  selectedPropertyId: string;
  allowExtraChannels: boolean;
  onSelectProperty: (id: string) => void;
}

export function MatchingView({
  pool,
  selectedPropertyId,
  allowExtraChannels,
  onSelectProperty,
}: MatchingViewProps) {
  const sellers = pool.filter((c) => c.role === 'Venditore' || c.role === 'Locatore');
  const selectedProperty = sellers.find((c) => String(c.id) === String(selectedPropertyId));
  const effectiveSelectedPropertyId = selectedProperty ? String(selectedProperty.id) : '';
  const matches = effectiveSelectedPropertyId ? computeMatches(pool, effectiveSelectedPropertyId) : [];
  const targetBuyerRole = selectedProperty?.role === 'Locatore' ? 'inquilino' : 'acquirente';

  return (
    <section aria-label="Incrocio Automatico Domanda e Offerta" className="space-y-4">
      <div className="bg-white border border-[#cbe2de] p-5 rounded-xl space-y-3">
        <div>
          <h2 className="font-bold text-base text-[#0e4d5f] flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-[#2eb086]" aria-hidden="true" /> Incrocio Automatico Domanda / Offerta
          </h2>
          <p className="text-xs text-[#4a707a] mt-1">
            Seleziona un immobile (Venditore o Locatore) per incrociare gli Acquirenti o Inquilini compatibili per Tipologia, Zona e Budget.
          </p>
        </div>

        <div>
          <label htmlFor="matching-property-select" className="block text-xs font-semibold text-[#0e4d5f] mb-1.5">
            Seleziona Immobile in Portafoglio
          </label>
          <select
            id="matching-property-select"
            value={effectiveSelectedPropertyId}
            onChange={(e) => onSelectProperty(e.target.value)}
            className="w-full bg-[#f4faf9] border border-[#cbe2de] rounded-lg px-3 py-2 text-sm text-[#0f3b47] focus:outline-none focus:border-[#2eb086]"
          >
            <option value="">-- Seleziona un Immobile in Vendita/Affitto --</option>
            {sellers.map((s) => {
              const typeLabel = s.role === 'Locatore' ? 'Affitto' : 'Vendita';
              return (
                <option key={s.id} value={s.id}>
                  [{typeLabel}] {s.name} — {s.propertyType} in {s.zone || 'Zona N/D'} ({formatCurrencyEUR(s.price)})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {!effectiveSelectedPropertyId ? (
        <div className="text-center py-10 text-[#5a808a] text-sm bg-white border border-[#cbe2de] rounded-xl">
          Seleziona un immobile dal menu per calcolare le corrispondenze con le richieste dei clienti.
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-10 text-[#4a707a] text-sm bg-white border border-[#cbe2de] rounded-xl">
          Nessun {targetBuyerRole} attivo in archivio corrisponde ai parametri di questo immobile.
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(({ buyer, score, reasons }) => {
            const telHref = String(buyer.phone || '').replace(/[^\d+]/g, '');
            return (
              <article
                key={buyer.id}
                data-testid={`match-result-${buyer.id}`}
                className="bg-white border border-[#cbe2de] p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-[#177858] font-mono tabular-nums">
                      {score}% Compatibilità
                    </span>
                    <span aria-hidden="true" className="text-[#8bb3bd]">·</span>
                    <span className="text-sm font-bold text-[#0e4d5f]">{buyer.name}</span>
                    <span className="text-[#5a808a]">({buyer.status})</span>
                  </div>
                  <div className="text-xs text-[#3b5e68] tabular-nums">
                    Cerca {buyer.propertyType} in {buyer.zone || 'Zona N/D'} — Budget:{' '}
                    {formatCurrencyEUR(buyer.price)}
                  </div>
                  <div className="text-xs text-[#0e4d5f] flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                    {reasons.map((reason) => (
                      <span key={reason} className="inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-[#2eb086]" aria-hidden="true" />
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>

                {allowExtraChannels ? (
                  <a
                    href={buildWhatsAppUrl(
                      buyer.phone,
                      buyer.name,
                      selectedProperty?.zone,
                      selectedProperty?.propertyType,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <MessageSquare className="w-4 h-4" aria-hidden="true" /> Proponi Immobile
                  </a>
                ) : telHref ? (
                  <a
                    href={`tel:${telHref}`}
                    className="px-4 py-2 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Phone className="w-4 h-4" aria-hidden="true" /> Chiama Cliente
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
