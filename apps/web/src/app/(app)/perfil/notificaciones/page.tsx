'use client';

import { useState } from 'react';
import { es, NOTIFICATION_CATEGORIES, type NotificationCategory } from '@yugo/shared';
import {
  useNotifications,
  useNotificationSettings,
  useSetNotificationPreference,
  useSetQuietHours,
} from '@/lib/hooks';
import { Segment, Toggle } from '@/components/ui';
import { PageHeader } from '@/components/page-header';

type Tab = 'inbox' | 'preferences';

const CATEGORY_TONE: Record<string, string> = {
  CONNECTION: 'chip-olive',
  MESSAGE: '',
  INTEREST: 'chip-wheat',
  EVENT: '',
  GROUP: '',
  VERIFICATION: 'chip-olive',
  MODERATION: 'chip-wine',
  SUBSCRIPTION: 'chip-wheat',
};

/** Formats a whole hour the way es-DO reads it: "10:00 pm". */
const hourLabel = (hour: number) =>
  new Intl.DateTimeFormat('es-DO', { hour: 'numeric', minute: '2-digit', hour12: true }).format(
    new Date(2026, 0, 1, hour, 0),
  );

/** Notification centre and per-category preferences (RF-NOT-01/02). */
export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: settings } = useNotificationSettings();
  const setPreference = useSetNotificationPreference();
  const setQuietHours = useSetQuietHours();
  const [tab, setTab] = useState<Tab>('inbox');

  const quiet = settings?.quietHours ?? { enabled: true, startHour: 22, endHour: 7 };
  const pushFor = (category: NotificationCategory) =>
    settings?.preferences.find((preference) => preference.category === category)?.push ?? true;

  return (
    <div>
      <PageHeader title={es.notifications.title} backHref="/perfil" />
      <div className="px-4">
        <div className="mb-3">
          <Segment
            value={tab}
            onChange={setTab}
            options={[
              { value: 'inbox', label: 'Recibidas' },
              { value: 'preferences', label: 'Preferencias' },
            ]}
          />
        </div>

        {tab === 'inbox' ? (
          isLoading ? (
            <div className="card py-8 text-center text-sm text-muted">{es.common.loading}</div>
          ) : notifications.length === 0 ? (
            <div className="card py-8 text-center text-sm text-muted">
              No tienes notificaciones por ahora.
            </div>
          ) : (
            notifications.map((notification) => (
              // Lo no leído se marca con el borde de acento, no atenuando lo
              // leído: bajar la opacidad rompía el contraste AA del cuerpo.
              <div
                key={notification.id}
                className={`card ${notification.readAt ? '' : 'border-l-[3px] border-l-wheat'}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`chip ${CATEGORY_TONE[notification.category]}`}>
                    {es.notifications.categories[notification.category]}
                  </span>
                  <span className="text-[11px] text-muted">
                    {new Intl.DateTimeFormat('es-DO', {
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: 'America/Santo_Domingo',
                    }).format(new Date(notification.createdAt))}
                  </span>
                </div>
                <b className="mt-1.5 block text-[12.5px]">{notification.title}</b>
                <p className="text-[11px] text-muted">{notification.body}</p>
              </div>
            ))
          )
        ) : null}

        {tab === 'preferences' ? (
          <>
            <div className="card">
              {NOTIFICATION_CATEGORIES.map((category) => (
                <div key={category} className="list-row text-[12.5px]">
                  <span>{es.notifications.categories[category]}</span>
                  <span className="ml-auto">
                    <Toggle
                      on={pushFor(category)}
                      onChange={(value) =>
                        setPreference.mutate({ category, push: value, email: false })
                      }
                      label={es.notifications.categories[category]}
                    />
                  </span>
                </div>
              ))}
            </div>

            {/* RF-NOT-02: nothing pushes inside this window; it waits for it to close. */}
            <div className="card">
              <div className="flex items-center justify-between text-[12.5px]">
                <div>
                  <span>{es.notifications.quietHours}</span>
                  <div className="text-[11px] text-muted">
                    {hourLabel(quiet.startHour)} – {hourLabel(quiet.endHour)}
                  </div>
                </div>
                <Toggle
                  on={quiet.enabled}
                  onChange={(value) => setQuietHours.mutate({ ...quiet, enabled: value })}
                  label={es.notifications.quietHours}
                />
              </div>

              {quiet.enabled ? (
                <div className="mt-3 flex items-center gap-3">
                  <label className="flex-1 text-[11px] text-muted">
                    Desde
                    <select
                      className="field mt-1"
                      value={quiet.startHour}
                      onChange={(event) =>
                        setQuietHours.mutate({ ...quiet, startHour: Number(event.target.value) })
                      }
                    >
                      {Array.from({ length: 24 }, (_, hour) => (
                        <option key={hour} value={hour}>
                          {hourLabel(hour)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex-1 text-[11px] text-muted">
                    Hasta
                    <select
                      className="field mt-1"
                      value={quiet.endHour}
                      onChange={(event) =>
                        setQuietHours.mutate({ ...quiet, endHour: Number(event.target.value) })
                      }
                    >
                      {Array.from({ length: 24 }, (_, hour) => (
                        <option key={hour} value={hour}>
                          {hourLabel(hour)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <p className="mt-2 text-[11px] text-muted">
                Durante el horario silencioso no te llegan notificaciones al teléfono. Las guardamos
                y te las entregamos al terminar.
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
