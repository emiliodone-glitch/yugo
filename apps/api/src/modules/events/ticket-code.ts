import { randomInt } from 'crypto';

/**
 * Alfabeto de la entrada (RF-EVE-06): mayúsculas y dígitos sin los que se
 * confunden a simple vista (0/O, 1/I). Quien recibe en la puerta lo lee en
 * voz alta o lo teclea; un código que no se puede dictar no sirve.
 */
export const TICKET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const TICKET_LENGTH = 10;

export function generateTicketCode(): string {
  let code = '';
  for (let i = 0; i < TICKET_LENGTH; i += 1) {
    code += TICKET_ALPHABET[randomInt(TICKET_ALPHABET.length)];
  }
  return code;
}

/** Normaliza lo que teclean en la puerta: espacios, guiones y minúsculas. */
export function normalizeTicketCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

/** Prisma P2002: la columna única ya tiene ese valor. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}
