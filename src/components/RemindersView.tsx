import { Bell, CalendarPlus, Check, Edit3, FilterX, Lock, MessageSquare, Phone } from 'lucide-react';
import type { ClientRecord } from '../types/crm';
import { buildWhatsAppUrl, filterRemindersByDay, getClientNote } from '../utils/crmLogic';

interface RemindersViewProps {
  pool: ClientRecord[];
  selectedDayKey: string | null;
  allowExtraChannels: boolean;
  onClearDayFilter: () => void;
  onSnooze: (id: string, days: number) => void;
  onComplete: (id: string) => void;
  onEdit: (id: string) => void;
  onRequestNotifications: () => void;
  onRequireUpgrade: (reason: string) => void;
}

export function RemindersView({
  pool,
  selectedDayKey,
  allowExtraChannels,
  onClearDayFilter,
  onSnooze,
  onComplete,
  onEdit,
  onRequestNotifications,
  onRequireUpgrade,
}: RemindersViewProps) {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const clientsWithReminders = filterRemindersByDay(pool, selectedDayKey);

  const selectedDayLabel = selectedDayKey
    ? new Date(`${selectedDayKey}T12:00:00`).toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null;

  return (
    <section aria-label="Agenda Richiami e Appuntamenti" className="space-y-4">
      <div className="bg-[#0e4d5f] border border-[#0a3c4a] p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-white">
        <div>
          <h2 className="font-bold text-base flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#67e8f9]" aria-hidden="true" /> Agenda Richiami e Appuntamenti
          </h2>
          <p className="text-xs text-[#cbeee4] mt-0.5">
            {selectedDayLabel
              ? `Filtro attivo dalla Dashboard: ${selectedDayLabel}.`
              : 'Clienti ordinati per data di promemoria in scadenza oggi o arretrati.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {selectedDayKey && (
            <button
              type="button"
              onClick={onClearDayFilter}
              className="px-3.5 py-2 rounded-lg bg-white text-[#0e4d5f] hover:bg-[#eef6f5] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <FilterX className="w-3.5 h-3.5" aria-hidden="true" /> Mostra tutte le scadenze
            </button>
          )}
          <button
            type="button"
            onClick={onRequestNotifications}
            className="px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs border border-white/25 font-medium transition-colors whitespace-nowrap"
          >
            Abilita Notifiche Browser
          </button>
        </div>
      </div>

      {clientsWithReminders.length === 0 ? (
        <div className="text-center py-12 text-[#5a808a] text-sm border border-dashed border-[#cbe2de] bg-white rounded-xl space-y-2">
          <p>
            {selectedDayLabel
              ? `Nessun promemoria programmato per ${selectedDayLabel}.`
              : 'Nessun promemoria o richiamo programmato.'}
          </p>
          {selectedDayKey && (
            <button
              type="button"
              onClick={onClearDayFilter}
              className="px-3 py-1.5 rounded-lg bg-[#0e4d5f] text-white text-xs font-semibold"
            >
              Mostra tutti i richiami
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {clientsWithReminders.map((client) => {
            const rDate = new Date(client.reminderDate);
            const isOverdue = rDate < now;
            const isToday = !isOverdue && rDate <= endOfToday;
            const formattedDate = rDate.toLocaleString('it-IT', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });
            const telHref = String(client.phone || '').replace(/[^\d+]/g, '');

            let stateTextClass = 'text-[#177858]';
            let stateLabel = 'Programmato';
            if (isOverdue) {
              stateTextClass = 'text-rose-700';
              stateLabel = 'Scaduto · Da richiamare';
            } else if (isToday) {
              stateTextClass = 'text-amber-700';
              stateLabel = 'Oggi';
            }

            return (
              <article
                key={client.id}
                data-testid={`reminder-item-${client.id}`}
                className={`p-4 rounded-xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 ${
                  isOverdue ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-[#cbe2de]'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`font-bold ${stateTextClass}`}>{stateLabel}</span>
                    <span aria-hidden="true" className="text-[#8bb3bd]">·</span>
                    <span className="font-semibold text-[#0e4d5f] font-mono tabular-nums">
                      {formattedDate}
                    </span>
                  </div>
                  <h3 className="font-bold text-[#0e4d5f] text-base">
                    {client.name}{' '}
                    <span className="text-xs font-normal text-[#4a707a] tabular-nums">
                      ({client.role} · {client.phone})
                    </span>
                  </h3>
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
                      href={buildWhatsAppUrl(client.phone, client.name, client.zone, client.propertyType)}
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
    </section>
  );
}
