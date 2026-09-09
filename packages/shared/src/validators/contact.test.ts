import { describe, expect, it } from 'vitest';
import { containsContactData } from './contact';

describe('containsContactData (cierre digno, RF-CON-11)', () => {
  it('detecta teléfonos, correos, usuarios, enlaces y apps de mensajería', () => {
    expect(containsContactData('Escríbeme al 809-555-1234 mejor')).toBe(true);
    expect(containsContactData('mi correo es ana.perez@gmail.com')).toBe(true);
    expect(containsContactData('búscame en @ana_perez')).toBe(true);
    expect(containsContactData('te dejo www.misitio.com')).toBe(true);
    expect(containsContactData('pásate a whatsapp')).toBe(true);
  });

  it('deja pasar una despedida normal, con versículos y números pequeños', () => {
    expect(
      containsContactData('Gracias por estas semanas. Te deseo lo mejor, Salmo 37:5.'),
    ).toBe(false);
    expect(containsContactData('Nos vimos 3 veces y fue bonito, pero no es por aquí.')).toBe(false);
  });
});
