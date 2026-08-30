import { AUTO_APPROVE_SIMILARITY, shouldAutoApprove } from './verification.service';

/**
 * RF-VER-01. The dangerous failure here is silent: a deployment without a face
 * matching vendor that still approves identities on a made up score. These
 * cases pin the rule that only a real, high similarity plus liveness resolves
 * automatically — everything else waits for a person.
 */
describe('auto-aprobación de identidad (RF-VER-01)', () => {
  it('aprueba solo con prueba de vida y similitud alta', () => {
    expect(shouldAutoApprove(true, 0.97)).toBe(true);
    expect(shouldAutoApprove(true, AUTO_APPROVE_SIMILARITY)).toBe(true);
  });

  it('no aprueba sin prueba de vida, por alta que sea la similitud', () => {
    expect(shouldAutoApprove(false, 0.99)).toBe(false);
  });

  it('no aprueba cuando la similitud es desconocida', () => {
    // Sin foto principal, o con el proveedor caído: nunca se asume un pase.
    expect(shouldAutoApprove(true, null)).toBe(false);
  });

  it('no aprueba con el puntaje del stub de desarrollo', () => {
    // El stub devuelve 0.5 a propósito: por debajo del umbral, de modo que un
    // entorno sin proveedor encola cada selfie para revisión humana.
    expect(shouldAutoApprove(true, 0.5)).toBe(false);
  });

  it('no aprueba justo por debajo del umbral', () => {
    expect(shouldAutoApprove(true, AUTO_APPROVE_SIMILARITY - 0.01)).toBe(false);
  });
});
