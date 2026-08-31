import { z } from 'zod';
import { LIMITS } from '../constants/limits';

export const discoverFiltersSchema = z.object({
  ageMin: z.number().int().min(LIMITS.ADULT_AGE).optional(),
  ageMax: z.number().int().max(99).optional(),
  maxDistanceKm: z.number().int().min(5).max(500).optional(),
  denominationIds: z.array(z.string()).optional(),
  intention: z.enum(['MARRIAGE', 'FRIENDSHIP', 'BOTH']).optional(),
  minVerificationLevel: z.number().int().min(1).max(3).optional(),
  /**
   * RF-VER-02: solo personas respaldadas por su iglesia. Es gratuito a
   * propósito: el respaldo es la señal de confianza del producto y cobrar por
   * filtrarla empujaría a la gente hacia perfiles menos verificados.
   */
  endorsedOnly: z.boolean().optional(),
  withChildren: z.enum(['ANY', 'WITH', 'WITHOUT']).optional(),
  city: z.string().optional(),
  // Advanced filters — Plus (RF-DES-06); church/ministry filter — Oro (6.9)
  serviceAreaSlugs: z.array(z.string()).optional(),
  churchId: z.string().optional(),
  education: z.string().optional(),
});

/** RF-DES-04/07: mark interest, optionally with a message (Plus 140 / Oro 300). */
export const markInterestSchema = z.object({
  toUserId: z.string().min(1),
  message: z.string().trim().max(LIMITS.INTEREST_MESSAGE_MAX_ORO).optional(),
});

export const passSchema = z.object({ userId: z.string().min(1) });
export const saveProfileSchema = z.object({ userId: z.string().min(1) });

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

export type DiscoverFilters = z.infer<typeof discoverFiltersSchema>;
export type MarkInterestInput = z.infer<typeof markInterestSchema>;
