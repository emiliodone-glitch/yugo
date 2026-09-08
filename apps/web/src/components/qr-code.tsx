'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Un código QR de verdad (antes era una matriz decorativa que ningún lector
 * entendía). Se genera en el navegador como SVG, así se imprime nítido a
 * cualquier tamaño.
 */
export function QrCode({
  value,
  size = 200,
  className = '',
  label,
}: {
  value: string;
  size?: number;
  className?: string;
  label?: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#1B1F2A', light: '#FFFFFF' },
    })
      .then((markup) => {
        if (!cancelled) setSvg(markup);
      })
      .catch(() => {
        if (!cancelled) setSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!svg) {
    return (
      <div
        aria-hidden
        style={{ width: size, height: size }}
        className={`rounded-field bg-linen-2 ${className}`}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={label ?? 'Código QR'}
      style={{ width: size, height: size }}
      className={className}
      // El SVG lo genera la librería a partir de nuestro texto; no hay HTML ajeno.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
