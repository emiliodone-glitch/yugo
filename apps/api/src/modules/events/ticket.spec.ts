import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { ChurchesService } from '../churches/churches.service';
import { generateTicketCode, normalizeTicketCode, TICKET_ALPHABET } from './ticket-code';

/**
 * Entrada personal con código (RF-EVE-06).
 *
 * Lo que protege: solo quien va a asistir tiene entrada; el portal solo
 * registra entradas de sus propios eventos; registrar dos veces no duplica
 * ni mueve la hora; un código ajeno o inventado no revela nada. Y la
 * presencia de conexiones en la agenda respeta `allowEventPresenceVisible`
 * (RF-SEG-07), que es la otra promesa de privacidad de esta pantalla.
 */

const EVENT_ID = 'ev-vigilia';
const USER_ID = 'u-samuel';
const CODE = 'ABCDEFGHJK';

const publishedEvent = {
  id: EVENT_ID,
  title: 'Noche de adoración',
  status: 'PUBLISHED',
  startsAt: new Date('2026-10-10T23:00:00Z'),
  address: 'Av. San Vicente de Paúl 45',
};

describe('generateTicketCode', () => {
  it('produce 10 caracteres del alfabeto sin 0/O/1/I', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateTicketCode();
      expect(code).toHaveLength(10);
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
    }
    expect(TICKET_ALPHABET).not.toMatch(/[01OI]/);
  });

  it('normaliza lo que teclean en la puerta', () => {
    expect(normalizeTicketCode(' abcd-efgh jk ')).toBe('ABCDEFGHJK');
  });
});

function buildEvents(attendance: Record<string, unknown> | null) {
  const update = jest.fn().mockResolvedValue({});
  const prisma = {
    eventAttendance: {
      findUnique: jest.fn().mockResolvedValue(attendance),
      update,
    },
  };
  const service = new EventsService(prisma as never, {} as never, {} as never);
  return { service, update };
}

describe('EventsService.ticketFor', () => {
  it('crea el código la primera vez y lo devuelve con los datos del evento', async () => {
    const { service, update } = buildEvents({
      eventId: EVENT_ID,
      userId: USER_ID,
      status: 'GOING',
      ticketCode: null,
      checkedInAt: null,
      event: publishedEvent,
    });

    const ticket = await service.ticketFor(USER_ID, EVENT_ID);

    expect(ticket.code).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
    expect(update).toHaveBeenCalledWith({
      where: { eventId_userId: { eventId: EVENT_ID, userId: USER_ID } },
      data: { ticketCode: ticket.code },
    });
    expect(ticket).toMatchObject({
      eventId: EVENT_ID,
      title: publishedEvent.title,
      startsAt: publishedEvent.startsAt,
      place: publishedEvent.address,
      status: 'GOING',
      checkedInAt: null,
    });
  });

  it('reutiliza el código existente sin volver a escribir', async () => {
    const { service, update } = buildEvents({
      eventId: EVENT_ID,
      userId: USER_ID,
      status: 'GOING',
      ticketCode: CODE,
      checkedInAt: null,
      event: publishedEvent,
    });
    const ticket = await service.ticketFor(USER_ID, EVENT_ID);
    expect(ticket.code).toBe(CODE);
    expect(update).not.toHaveBeenCalled();
  });

  it('en lista de espera no hay entrada (409 not_going)', async () => {
    const { service, update } = buildEvents({
      eventId: EVENT_ID,
      userId: USER_ID,
      status: 'WAITLIST',
      ticketCode: null,
      checkedInAt: null,
      event: publishedEvent,
    });
    await expect(service.ticketFor(USER_ID, EVENT_ID)).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it('sin asistencia marcada no hay entrada (404)', async () => {
    const { service } = buildEvents(null);
    await expect(service.ticketFor(USER_ID, EVENT_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});

function buildPortal(options: {
  churchId: string;
  eventChurchId: string;
  attendance: Record<string, unknown> | null;
}) {
  const update = jest.fn().mockResolvedValue({});
  const prisma = {
    churchUser: {
      findFirst: jest.fn().mockResolvedValue({
        userId: 'u-portal',
        churchId: options.churchId,
        role: 'ADMIN',
        church: { id: options.churchId },
      }),
    },
    event: {
      findFirst: jest
        .fn()
        .mockImplementation(({ where }: { where: { churchId: string } }) =>
          Promise.resolve(where.churchId === options.eventChurchId ? { id: EVENT_ID } : null),
        ),
    },
    eventAttendance: {
      findUnique: jest.fn().mockResolvedValue(options.attendance),
      update,
    },
    verification: { findFirst: jest.fn().mockResolvedValue({ level: 2 }) },
  };
  const service = new ChurchesService(prisma as never, {} as never, {} as never, {} as never);
  return { service, update };
}

const goingAttendance = {
  eventId: EVENT_ID,
  userId: USER_ID,
  status: 'GOING',
  ticketCode: CODE,
  checkedInAt: null,
  user: { profile: { displayName: 'Samuel' } },
};

describe('ChurchesService.checkInTicket', () => {
  it('registra la entrada y devuelve solo nombre y nivel de verificación', async () => {
    const { service, update } = buildPortal({
      churchId: 'c-1',
      eventChurchId: 'c-1',
      attendance: goingAttendance,
    });

    const result = await service.checkInTicket('u-portal', EVENT_ID, ' abcd-efgh jk ');

    expect(result).toEqual({
      checkedIn: true,
      alreadyCheckedIn: false,
      attendee: { displayName: 'Samuel', verificationLevel: 2 },
    });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { ticketCode: CODE } }));
    expect(update.mock.calls[0][0].data.checkedInAt).toBeInstanceOf(Date);
  });

  it('es idempotente: la segunda vez avisa y no toca la hora original', async () => {
    const { service, update } = buildPortal({
      churchId: 'c-1',
      eventChurchId: 'c-1',
      attendance: { ...goingAttendance, checkedInAt: new Date('2026-10-10T23:05:00Z') },
    });
    const result = await service.checkInTicket('u-portal', EVENT_ID, CODE);
    expect(result.alreadyCheckedIn).toBe(true);
    expect(result.checkedIn).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it('rechaza a una iglesia que no organiza el evento', async () => {
    const { service, update } = buildPortal({
      churchId: 'c-otra',
      eventChurchId: 'c-1',
      attendance: goingAttendance,
    });
    await expect(service.checkInTicket('u-portal', EVENT_ID, CODE)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('un código inventado es invalid_ticket', async () => {
    const { service } = buildPortal({ churchId: 'c-1', eventChurchId: 'c-1', attendance: null });
    await expect(service.checkInTicket('u-portal', EVENT_ID, 'ZZZZZZZZZZ')).rejects.toMatchObject({
      message: 'invalid_ticket',
    });
  });

  it('un código de otro evento es invalid_ticket', async () => {
    const { service, update } = buildPortal({
      churchId: 'c-1',
      eventChurchId: 'c-1',
      attendance: { ...goingAttendance, eventId: 'ev-otro' },
    });
    await expect(service.checkInTicket('u-portal', EVENT_ID, CODE)).rejects.toMatchObject({
      message: 'invalid_ticket',
    });
    expect(update).not.toHaveBeenCalled();
  });
});

describe('EventsService.agenda · presencia de conexiones (RF-SEG-07)', () => {
  it('omite a la conexión que pidió no ser visible en eventos', async () => {
    const attendances = [
      {
        userId: 'u-mariel',
        status: 'GOING',
        user: { profile: { displayName: 'Mariel', allowEventPresenceVisible: true } },
      },
      {
        userId: 'u-daniela',
        status: 'GOING',
        user: { profile: { displayName: 'Daniela', allowEventPresenceVisible: false } },
      },
      {
        userId: 'u-ajena',
        status: 'GOING',
        user: { profile: { displayName: 'Ajena', allowEventPresenceVisible: true } },
      },
    ];
    const prisma = {
      profile: { findUnique: jest.fn().mockResolvedValue(null) },
      event: {
        findMany: jest.fn().mockResolvedValue([
          {
            ...publishedEvent,
            type: 'VIGILIA',
            endsAt: null,
            city: 'Santo Domingo',
            lat: null,
            lng: null,
            capacity: null,
            audience: 'CONGREGATION',
            costAmount: null,
            church: { name: 'Monte de Sion' },
            attendances,
          },
        ]),
      },
      match: {
        findMany: jest.fn().mockResolvedValue([
          { userAId: USER_ID, userBId: 'u-mariel' },
          { userAId: 'u-daniela', userBId: USER_ID },
        ]),
      },
    };
    const service = new EventsService(prisma as never, {} as never, {} as never);

    const [event] = await service.agenda(USER_ID);

    expect(event.connectionsGoing).toEqual([{ userId: 'u-mariel', displayName: 'Mariel' }]);
    // Los totales sí cuentan a todo el mundo: ocultar la presencia no es
    // desaparecer de la cuenta de asistentes.
    expect(event.goingCount).toBe(3);
  });
});
