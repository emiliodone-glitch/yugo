'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { colors } from '@yugo/ui-tokens';
import type { EventMapProps } from './event-map';

const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

/**
 * Los iconos por defecto de Leaflet apuntan a PNG que el empaquetador no
 * sirve; un pin SVG en los colores de la marca evita el marcador roto y de
 * paso se ve como el resto de la interfaz.
 */
function pinIcon(color: string, selected: boolean): L.DivIcon {
  const size = selected ? 36 : 30;
  const html = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.3}" viewBox="0 0 24 32" aria-hidden="true" focusable="false">
  <path d="M12 0C5.4 0 0 5.4 0 12c0 8.6 12 20 12 20s12-11.4 12-20C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
  <circle cx="12" cy="12" r="4.5" fill="#fff"/>
</svg>`;
  return L.divIcon({
    html,
    className: 'yugo-pin',
    iconSize: [size, size * 1.3],
    iconAnchor: [size / 2, size * 1.3],
  });
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function EventMapLeaflet({
  events,
  selectedId,
  onSelect,
  className = '',
  label,
}: EventMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // El mapa se crea una vez; los pines se redibujan cuando cambian los datos.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    const still = reducedMotion();
    const map = L.map(container, {
      scrollWheelZoom: false,
      zoomAnimation: !still,
      fadeAnimation: !still,
      markerZoomAnimation: !still,
      attributionControl: true,
    });
    map.attributionControl.setPrefix(false);
    L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // La tarjeta que lo contiene entra con una animación: al terminar, el
    // mapa recalcula su tamaño para no dejar teselas sin pintar.
    const timer = window.setTimeout(() => map.invalidateSize({ animate: false }), 400);
    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (events.length === 0) return;
    const still = reducedMotion();
    for (const event of events) {
      const selected = event.id === selectedId;
      const marker = L.marker([event.lat, event.lng], {
        icon: pinIcon(selected ? colors.wine : colors.olive, selected),
        title: event.title,
        alt: event.title,
        keyboard: true,
        zIndexOffset: selected ? 1000 : 0,
      });
      marker.on('click', () => onSelectRef.current?.(event.id));
      marker.on('keypress', (keyboardEvent) => {
        const key = (keyboardEvent as unknown as { originalEvent: KeyboardEvent }).originalEvent
          .key;
        if (key === 'Enter' || key === ' ') onSelectRef.current?.(event.id);
      });
      marker.addTo(layer);
    }
    if (events.length === 1) {
      map.setView([events[0].lat, events[0].lng], 15, { animate: false });
    } else {
      const bounds = L.latLngBounds(events.map((event) => [event.lat, event.lng]));
      map.fitBounds(bounds, { padding: [28, 28], animate: false, maxZoom: 13 });
    }
    // Sin animaciones el pin elegido se centra al instante; con ellas, suave.
    if (selectedId) {
      const target = events.find((event) => event.id === selectedId);
      if (target && events.length > 1) {
        map.panTo([target.lat, target.lng], { animate: !still });
      }
    }
  }, [events, selectedId]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={label}
      className={`overflow-hidden rounded-lg border border-line bg-linen-2 ${className}`}
    />
  );
}
