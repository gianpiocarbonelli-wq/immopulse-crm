import { CalendarClock, CheckCircle2, Clock, Users, XCircle } from 'lucide-react';
import type { CrmMetrics, PlanTier } from '../types/crm';

interface MetricsStripProps {
  metrics: CrmMetrics;
  plan: PlanTier;
  limit: number;
  onOpenReminders: () => void;
}

export function MetricsStrip({ metrics, plan, limit, onOpenReminders }: MetricsStripProps) {
  const limitText = plan === 'full' || plan === 'agency' || !Number.isFinite(limit) ? 'Illimitati' : `Max ${limit}`;

  return (
    <section aria-label="Indicatori CRM" className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="bg-white border border-[#cbe2de] p-4 rounded-xl flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#4a707a]">
          <span className="text-xs font-medium">Totale Clienti</span>
          <Users className="w-4 h-4 text-[#0e4d5f]" aria-hidden="true" />
        </div>
        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <span data-testid="metric-total" className="text-2xl font-bold text-[#0e4d5f] font-mono tabular-nums">
            {metrics.total}
          </span>
          <span className="text-xs text-[#5a808a] tabular-nums">{limitText}</span>
        </div>
      </div>

      <div className="bg-white border border-[#cbe2de] p-4 rounded-xl flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#4a707a]">
          <span className="text-xs font-medium">In Corso / Trattativa</span>
          <Clock className="w-4 h-4 text-amber-600" aria-hidden="true" />
        </div>
        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <span data-testid="metric-active" className="text-2xl font-bold text-amber-700 font-mono tabular-nums">
            {metrics.active}
          </span>
          <span className="text-xs text-amber-700/80 font-medium">Attivi</span>
        </div>
      </div>

      <div className="bg-white border border-[#cbe2de] p-4 rounded-xl flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#4a707a]">
          <span className="text-xs font-medium">Accettati</span>
          <CheckCircle2 className="w-4 h-4 text-[#1d8f6a]" aria-hidden="true" />
        </div>
        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <span data-testid="metric-won" className="text-2xl font-bold text-[#1d8f6a] font-mono tabular-nums">
            {metrics.won}
          </span>
          <span className="text-xs text-[#1d8f6a] font-medium tabular-nums">
            {metrics.conversionRate}% conv.
          </span>
        </div>
      </div>

      <div className="bg-white border border-[#cbe2de] p-4 rounded-xl flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#4a707a]">
          <span className="text-xs font-medium">Persi</span>
          <XCircle className="w-4 h-4 text-rose-600" aria-hidden="true" />
        </div>
        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <span data-testid="metric-lost" className="text-2xl font-bold text-rose-700 font-mono tabular-nums">
            {metrics.lost}
          </span>
          <span className="text-xs text-[#5a808a]">Chiusi</span>
        </div>
      </div>

      <div className="col-span-2 md:col-span-1 bg-[#0e4d5f] border border-[#0a3c4a] p-4 rounded-xl flex flex-col justify-between text-white">
        <div className="flex items-center justify-between text-[#cbeee4]">
          <span className="text-xs font-medium">Promemoria Oggi</span>
          <CalendarClock className="w-4 h-4 text-[#67e8f9]" aria-hidden="true" />
        </div>
        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <span data-testid="metric-reminders" className="text-2xl font-bold text-white font-mono tabular-nums">
            {metrics.remindersDue}
          </span>
          <button
            type="button"
            onClick={onOpenReminders}
            className="text-xs text-[#8ef7e0] hover:text-white hover:underline font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white rounded"
          >
            Vedi tutti &rarr;
          </button>
        </div>
      </div>
    </section>
  );
}
