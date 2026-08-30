'use client';

import { useState } from 'react';
import { demoNotifications, es } from '@yugo/shared';
import { Segment, Toggle } from '@/components/ui';
import { PageHeader } from '@/components/page-header';

type Tab = 'inbox' | 'preferences';

const CATEGORIES = [
  'CONNECTION',
  'MESSAGE',
  'INTEREST',
  'EVENT',
  'GROUP',
  'VERIFICATION',
  'MODERATION',
  'SUBSCRIPTION',
] as const;

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

/** Notification centre and per-category preferences (RF-NOT-01/02). */
export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('inbox');
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES.map((category) => [category, true])),
  );
  const [quietHours, setQuietHours] = useState(true);

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

        {tab === 'inbox'
          ? demoNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`card ${notification.readAt ? 'opacity-70' : ''}`}
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
          : null}

        {tab === 'preferences' ? (
          <>
            <div className="card">
              {CATEGORIES.map((category) => (
                <div key={category} className="list-row text-[12.5px]">
                  <span>{es.notifications.categories[category]}</span>
                  <span className="ml-auto">
                    <Toggle
                      on={prefs[category]}
                      onChange={(value) => setPrefs((p) => ({ ...p, [category]: value }))}
                      label={es.notifications.categories[category]}
                    />
                  </span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="flex items-center justify-between text-[12.5px]">
                <div>
                  <span>{es.notifications.quietHours}</span>
                  <div className="text-[11px] text-muted">10:00 pm – 7:00 am</div>
                </div>
                <Toggle on={quietHours} onChange={setQuietHours} label={es.notifications.quietHours} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
