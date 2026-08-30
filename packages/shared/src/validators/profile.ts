import { z } from 'zod';
import { LIMITS } from '../constants/limits';

export const SERVICE_AREA_MAX_SELECTION = 8;

/**
 * RF-DES-11 / 7.2: the declared age range is mandatory, spans at least
 * 3 years and can never include minors. No subscription tier relaxes this.
 */
export const ageRangeSchema = z
  .object({
    ageMin: z.number().int().min(LIMITS.ADULT_AGE),
    ageMax: z.number().int().max(99),
  })
  .refine((r) => r.ageMax - r.ageMin >= LIMITS.AGE_RANGE_MIN_SPAN, {
    message: 'age_range_too_narrow',
    path: ['ageMax'],
  });

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(40).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  province: z.string().trim().min(2).max(80).optional(),
  occupation: z.string().trim().max(80).optional(),
  education: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(300).optional(),
  testimony: z.string().trim().max(LIMITS.TESTIMONY_MAX).optional(),
  verse: z.string().trim().max(120).optional(),
  denominationId: z.string().optional(),
  churchId: z.string().nullable().optional(),
  churchFreeText: z.string().trim().max(120).optional(),
  yearsInFaith: z.number().int().min(0).max(90).optional(),
  attendance: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'OCCASIONAL']).optional(),
  intention: z.enum(['MARRIAGE', 'FRIENDSHIP', 'BOTH']).optional(),
  openness: z.enum(['SAME', 'AFFINE', 'ALL']).optional(),
  practiceSlugs: z.array(z.string()).max(SERVICE_AREA_MAX_SELECTION).optional(),
  hasChildren: z.boolean().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const searchPreferencesSchema = ageRangeSchema.and(
  z.object({
    maxDistanceKm: z.number().int().min(5).max(500).optional(),
    intention: z.enum(['MARRIAGE', 'FRIENDSHIP', 'BOTH']).optional(),
    withChildren: z.enum(['ANY', 'WITH', 'WITHOUT']).optional(),
    minVerificationLevel: z.number().int().min(1).max(3).optional(),
  }),
);

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type SearchPreferencesInput = z.infer<typeof searchPreferencesSchema>;
