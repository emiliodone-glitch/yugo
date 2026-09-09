'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from './skeleton';

export interface EventMapPoint {
  id: string;
  title: string;
  lat: number;
  lng: number;
}

export interface EventMapProps {
  events: EventMapPoint[];
  /** Pin resaltado (el evento abierto o la tarjeta elegida). */
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
  /** Nombre accesible del mapa. */
  label: string;
}

/**
 * Mapa de eventos con Leaflet y teselas de OpenStreetMap. Leaflet toca
 * `window` al importarse, así que solo se carga en el navegador; mientras
 * llega, ocupa su sitio un esqueleto del mismo alto para que la página no
 * salte.
 */
export const EventMap = dynamic<EventMapProps>(
  () => import('./event-map-leaflet').then((module) => module.EventMapLeaflet),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full min-h-[150px] w-full rounded-lg" />,
  },
);
