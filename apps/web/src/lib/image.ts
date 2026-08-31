'use client';

import { LIMITS } from '@yugo/shared';

/** Longest side of an uploaded photo. Bigger buys nothing on a phone screen. */
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.85;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface PreparedPhoto {
  blob: Blob;
  contentType: string;
  /** Object URL for the preview; revoke it when the preview goes away. */
  previewUrl: string;
}

/**
 * Centre-crops to a square and downscales before upload.
 *
 * Cropping in the browser matters for more than bandwidth: every surface shows
 * photos in a square or a circle, so letting the server keep a 4:3 original
 * would mean the member never sees the same framing we show to everyone else.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('unsupported_image_type');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const edge = Math.min(bitmap.width, bitmap.height);
    const target = Math.min(edge, MAX_EDGE);

    const canvas = document.createElement('canvas');
    canvas.width = target;
    canvas.height = target;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas_unavailable');

    context.drawImage(
      bitmap,
      (bitmap.width - edge) / 2,
      (bitmap.height - edge) / 2,
      edge,
      edge,
      0,
      0,
      target,
      target,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob) throw new Error('encode_failed');

    return {
      blob,
      contentType: 'image/jpeg',
      previewUrl: URL.createObjectURL(blob),
    };
  } finally {
    bitmap.close();
  }
}

export const PHOTO_LIMITS = {
  min: LIMITS.PHOTOS_MIN,
  max: LIMITS.PHOTOS_MAX,
};
