import { describe, expect, it } from 'vitest';
import { destinationFor } from './routing';

describe('destino de una notificación tocada (RF-NOT-03)', () => {
  it('lleva al chat cuando trae la conversación', () => {
    expect(destinationFor({ conversationId: 'c-1', category: 'MESSAGE' })).toEqual({
      screen: 'conversation',
      id: 'c-1',
    });
  });

  it('el id concreto gana sobre la categoría', () => {
    // Una conexión nueva trae categoría CONNECTION y su conversación: abrir el
    // chat es más útil que abrir el centro de notificaciones.
    expect(destinationFor({ category: 'CONNECTION', conversationId: 'c-2' })).toEqual({
      screen: 'conversation',
      id: 'c-2',
    });
  });

  it('lleva al evento y al grupo por su id', () => {
    expect(destinationFor({ eventId: 'ev-1' })).toEqual({ screen: 'event', id: 'ev-1' });
    expect(destinationFor({ groupId: 'g-1' })).toEqual({ screen: 'group', id: 'g-1' });
  });

  it('usa la categoría cuando no hay id', () => {
    expect(destinationFor({ category: 'INTEREST' })).toEqual({ screen: 'interested-in-you' });
    expect(destinationFor({ category: 'VERIFICATION' })).toEqual({ screen: 'verification' });
  });

  it('nunca deja el toque sin destino', () => {
    expect(destinationFor(undefined)).toEqual({ screen: 'notifications' });
    expect(destinationFor({})).toEqual({ screen: 'notifications' });
    expect(destinationFor({ category: 'SUBSCRIPTION' })).toEqual({ screen: 'notifications' });
  });

  it('ignora valores que no son texto', () => {
    // El payload viaja como JSON desde el servidor: un id numérico o nulo no
    // debe convertirse en una ruta rota.
    expect(destinationFor({ conversationId: 42 })).toEqual({ screen: 'notifications' });
    expect(destinationFor({ conversationId: null, category: 'INTEREST' })).toEqual({
      screen: 'interested-in-you',
    });
  });
});
