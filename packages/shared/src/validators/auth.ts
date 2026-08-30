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
 * RF-AUT-01/03: registration requires email or phone, a birth date that
 * proves the person is 18 or older (enforced again server-side), and gender.
 */
export const registerSchema = z
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
  })
  .refine((data) => isAdult(data.birthDate), {
    message: 'must_be_adult',
    path: ['birthDate'],
  });

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
