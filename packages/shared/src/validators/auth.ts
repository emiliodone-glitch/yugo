import { z } from 'zod';
import { LIMITS } from '../constants/limits';

/** Age in full years at `now` for a given birth date. */
export function ageFromBirthDate(birthDate: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    now.getMonth() < birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function isAdult(birthDate: Date, now: Date = new Date()): boolean {
  return ageFromBirthDate(birthDate, now) >= LIMITS.ADULT_AGE;
}

export const emailSchema = z.string().trim().toLowerCase().email();
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, 'invalid_phone');

/**
 * RF-AUT-01: shape of a registration request. Deliberately does NOT check
 * adulthood: the API validates that in the service so an underage attempt is
 * written to the audit log before being rejected (RF-AUT-03). Rejecting it
 * here would return 400 and leave no trace of who tried.
 */
export const registerRequestSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    password: z.string().min(8).max(128),
    birthDate: z.coerce.date(),
    gender: z.enum(['MALE', 'FEMALE']),
  })
  .refine((data) => data.email || data.phone, {
    message: 'email_or_phone_required',
    path: ['email'],
  });

/**
 * RF-AUT-03: the same shape plus the age rule, for the clients — the onboarding
 * wizard tells the person before they submit. It is a courtesy, never the
 * enforcement: the server checks again and is the only authority.
 */
export const registerSchema = registerRequestSchema.refine(
  (data) => isAdult(data.birthDate),
  { message: 'must_be_adult', path: ['birthDate'] },
);

export const loginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
});

export const otpVerifySchema = z.object({
  identifier: z.string().trim().min(3),
  code: z.string().regex(/^[0-9]{6}$/),
});

/** RF-AUT-04: explicit, versioned acceptance of the covenant. */
export const covenantAcceptSchema = z.object({
  version: z.string().min(1),
  accepted: z.literal(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
