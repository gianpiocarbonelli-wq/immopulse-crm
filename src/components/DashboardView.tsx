import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  CalendarPlus,
  Check,
  Edit3,
  FilterX,
  Lock,
  MessageSquare,
  Phone,
} from 'lucide-react';
import type { ClientRecord, UpcomingDayBucket } from '../types/crm';
import { buildUpcoming7DaysBuckets, buildWhatsAppUrl, getClientNote } from '../utils/crmLogic';

interface DashboardViewProps {
  pool: ClientRecord[];
  selectedDayKey: string | null;
  allowExtraChannels: boolean;
  onSelectDay: (dayKey: string | null) => void;
  onSnooze: (id: string, days: number) => void;
  onComplete: (id: string) => void;
  onEdit: (id: string) => void;
  onOpenFullAgenda: () => void;
  onRequireUpgrade: (reason: string) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: UpcomingDayBucket }>;
}

function DashboardTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const bucket = payload[0]?.payload;
  if (!bucket) return null;

  return (
    <div className="bg-white border border-[#cbe2de] rounded-lg px-3 py-2 shadow-md text-xs">
      <div className="font-bold text-[#0e4d5f]">{bucket.fullLabel}</div>
      <div className="text-[#3b5e68] mt-0.5 tabular-nums">
        <span className="font-mono font-bold text-[#177858]">{bucket.count}</span>{' '}
        {bucket.count === 1 ? 'richiamo previsto' : 'richiami previsti'}
      </div>
      <div className="text-[11px] text-[#5a808a] mt-0.5">Clicca per filtrare l&apos;agenda</div>
    </div>
  );
}

export function DashboardView({
  pool,
  selectedDayKey,
  allowExtraChannels,
  onSelectDay,
  onSnooze,
  onComplete,
  onEdit,
  onOpenFullAgenda,
  onRequireUpgrade,
}: DashboardViewProps) {
  const buckets = buildUpcoming7DaysBuckets(pool);
  const total7Days = buckets.reduce((sum, b) => sum + b.count, 0);
  const selectedBucket = selectedDayKey
    ? buckets.find((b) => b.dateKey === selectedDayKey) || null
    : null;

  const agendaItems = selectedBucket
    ? selectedBucket.clients
    : buckets
        .flatMap((b) => b.clients)
        .sort((a, b) => new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime());

  const handleBarClick = (entry: unknown) => {
    const record = entry as { dateKey?: string; payload?: { dateKey?: string } } | null;
    const clickedKey = record?.payload?.dateKey ?? record?.dateKey;
    if (!clickedKey) return;
    onSelectDay(selectedDayKey === clickedKey ? null : clickedKey);
  };

  return (
    <section aria-label="Dashboard richiami prossimi 7 giorni" className="space-y-6">
      {/* Chart Card */}
      <div className="bg-white border border-[#cbe2de] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-base text-[#0e4d5f] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#2eb086]" aria-hidden="true" />
              <span>Dashboard Richiami — Prossimi 7 Giorni</span>
            </h2>
            <p className="text-xs text-[#4a707a] mt-0.5">
              Clicca su una barra del grafico per filtrare l&apos;agenda per giorno.{' '}
              <span className="font-semibold text-[#0e4d5f] font-mono tabular-nums">
                {total7Days}
              </span>{' '}
              {total7Days === 1 ? 'richiamo programmato' : 'richiami programmati'} nei prossimi 7
              giorni.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {selectedBucket && (
              <button
                type="button"
                onClick={() => onSelectDay(null)}
                className="px-3 py-1.5 rounded-lg bg-[#eef6f5] hover:bg-[#dceceb] text-[#0e4d5f] border border-[#cbe2de] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <FilterX className="w-3.5 h-3.5" aria-hidden="true" /> Mostra tutti i 7 giorni
              </button>
            )}
            <button
              type="button"
              onClick={onOpenFullAgenda}
              className="px-3 py-1.5 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-semibold whitespace-nowrap"
            >
              Apri Agenda Completa
            </button>
          </div>
        </div>

        {/* Recharts BarChart */}
        <div data-testid="dashboard-chart-container" className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={buckets}
              margin={{ top: 12, right: 12, left: -12, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1f0ed" />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: '#4a707a', fontSize: 12 }}
                axisLine={{ stroke: '#cbe2de' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#4a707a', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#eef6f5' }}
                content={<DashboardTooltip />}
              />
              <Bar
                dataKey="count"
                name="Richiami"
                maxBarSize={48}
                radius={[6, 6, 0, 0]}
                cursor="pointer"
                onClick={handleBarClick}
              >
                {buckets.map((bucket) => {
                  const isSelected = selectedDayKey === bucket.dateKey;
                  let fillColor = '#2eb086';
                  if (isSelected) {
                    fillColor = '#0e4d5f';
                  } else if (bucket.count === 0) {
                    fillColor = '#dceceb';
                  }
                  return <Cell key={bucket.dateKey} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Accessible quick-filter day buttons synced with bars */}
        <div
          aria-label="Selezione rapida giorno"
          className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#e1f0ed]"
        >
          {buckets.map((bucket) => {
            const isSelected = selectedDayKey === bucket.dateKey;
            return (
              <button
                key={`day-filter-${bucket.dateKey}`}
                type="button"
                aria-pressed={isSelected}
                data-testid={`day-filter-${bucket.dateKey}`}
                onClick={() => onSelectDay(isSelected ? null : bucket.dateKey)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#0e4d5f] text-white'
                    : 'bg-[#f4faf9] hover:bg-[#e1f0ed] text-[#0e4d5f] border border-[#cbe2de]'
                }`}
              >
                <span>{bucket.shortLabel}</span>
                <span
                  className={`font-mono tabular-nums text-[11px] font-bold ${
                    isSelected ? 'text-[#8ef7e0]' : 'text-[#177858]'
                  }`}
                >
                  {bucket.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtered Agenda Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-[#0e4d5f]">
              {selectedBucket
                ? `Agenda filtrata — ${selectedBucket.fullLabel}`
                : 'Agenda Richiami — Prossimi 7 giorni'}
            </h3>
            <p className="text-xs text-[#4a707a] tabular-nums">
              {agendaItems.length}{' '}
              {agendaItems.length === 1 ? 'appuntamento trovato' : 'appuntamenti trovati'}
            </p>
          </div>
          {selectedBucket && (
            <button
              type="button"
              onClick={() => onSelectDay(null)}
              className="text-xs font-semibold text-[#0e4d5f] hover:text-[#177858] underline"
            >
              Azzera filtro giorno
            </button>
          )}
        </div>

        {agendaItems.length === 0 ? (
          <div className="text-center py-10 text-[#5a808a] text-sm border border-dashed border-[#cbe2de] bg-white rounded-xl">
            {selectedBucket
              ? `Nessun richiamo previsto per ${selectedBucket.fullLabel}.`
              : 'Nessun richiamo previsto nei prossimi 7 giorni.'}
          </div>
        ) : (
          <div data-testid="dashboard-agenda-list" className="space-y-3">
            {agendaItems.map((client) => {
              const rDate = new Date(client.reminderDate);
              const formattedDate = rDate.toLocaleString('it-IT', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              const telHref = String(client.phone || '').replace(/[^\d+]/g, '');
              const isOverdue = rDate < new Date();

              return (
                <article
                  key={`dash-rem-${client.id}`}
                  data-testid={`dashboard-agenda-item-${client.id}`}
                  className={`p-4 rounded-xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 ${
                    isOverdue ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-[#cbe2de]'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`font-bold ${isOverdue ? 'text-rose-700' : 'text-[#177858]'}`}
                      >
                        {isOverdue ? 'Scaduto oggi' : 'Programmato'}
                      </span>
                      <span aria-hidden="true" className="text-[#8bb3bd]">
                        ·
                      </span>
                      <span className="font-semibold text-[#0e4d5f] font-mono tabular-nums">
                        {formattedDate}
                      </span>
                    </div>
                    <h4 className="font-bold text-[#0e4d5f] text-base">
                      {client.name}{' '}
                      <span className="text-xs font-normal text-[#4a707a] tabular-nums">
                        ({client.role} · {client.phone})
                      </span>
                    </h4>
                    <p className="text-xs text-[#3b5e68]">
                      {client.propertyType} a {client.zone || 'N/D'} —{' '}
                      {getClientNote(client) || 'Nessuna nota inserita'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => onSnooze(client.id, 1)}
                      aria-label={`Posticipa richiamo di ${client.name} di 1 giorno`}
                      className="px-3 py-1.5 rounded-lg bg-[#f4faf9] hover:bg-[#e1f0ed] text-[#0e4d5f] text-xs font-medium border border-[#cbe2de] inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" /> +1g
                    </button>
                    <button
                      type="button"
                      onClick={() => onComplete(client.id)}
                      aria-label={`Completa richiamo di ${client.name}`}
                      className="px-3 py-1.5 rounded-lg bg-[#f4faf9] hover:bg-[#2eb086]/15 text-[#177858] text-xs font-medium border border-[#cbe2de] inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" /> Completa
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(client.id)}
                      aria-label={`Modifica scheda di ${client.name}`}
                      className="px-3 py-1.5 rounded-lg bg-[#f4faf9] hover:bg-[#e1f0ed] text-[#0e4d5f] text-xs font-medium border border-[#cbe2de] inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" /> Modifica
                    </button>

                    {allowExtraChannels ? (
                      <a
                        href={buildWhatsAppUrl(
                          client.phone,
                          client.name,
                          client.zone,
                          client.propertyType,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#2eb086]/15 hover:bg-[#2eb086]/25 text-[#177858] text-xs font-medium border border-[#2eb086]/30 inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> WhatsApp
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRequireUpgrade('WhatsApp richiede il piano Basic o Completo.')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" /> WhatsApp
                      </button>
                    )}

                    {telHref && (
                      <a
                        href={`tel:${telHref}`}
                        className="px-3 py-1.5 rounded-lg bg-[#0e4d5f] hover:bg-[#0a3c4a] text-white text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Chiama Ora
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
