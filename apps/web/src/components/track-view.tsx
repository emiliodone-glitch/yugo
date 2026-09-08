'use client';

import { useEffect } from 'react';
import { track } from '@/lib/hooks';

/** Registra una vista anónima al montar (embudo de activación, RF-ADM-12). */
export function TrackView({ name }: { name: string }) {
  useEffect(() => {
    track(name);
  }, [name]);
  return null;
}
