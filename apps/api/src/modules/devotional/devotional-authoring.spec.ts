import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DevotionalService } from './devotional.service';

/**
 * Autoría de devocionales.
 *
 * Lo que protege: que la reserva cuente días consecutivos (un hueco la corta,
 * porque ese día ya no habría devocional aunque hubiera más después), y que un
 * devocional ya leído no se pueda reescribir ni borrar — lo que alguien leyó
 * fue lo que leyó.
 */

const NOW = new Date('2026-08-31T16:00:00Z'); // mediodía en Santo Domingo
const day = (offset: number) =>
  new Date(Date.parse('2026-08-31T00:00:00Z') + offset * 86_400_000);

interface Row {
  id: string;
  publishOn: Date;
  reference: string;
  title: string;
  body: string;
  question: string;
  reads: number;
}

function buildService(rows: Row[]) {
  const store = [...rows];
  const withCount = (r: Row) => ({ ...r, _count: { reads: r.reads } });

  const prisma = {
    devotional: {
      findMany: async ({ where }: { where: { publishOn: { gte: Date } } }) =>
        store
          .filter((r) => r.publishOn.getTime() >= where.publishOn.gte.getTime())
          .sort((a, b) => a.publishOn.getTime() - b.publishOn.getTime())
          .map(withCount),
      findUnique: async ({ where }: { where: { publishOn?: Date; id?: string } }) => {
        const r = store.find((x) =>
          where.publishOn ? x.publishOn.getTime() === where.publishOn.getTime() : x.id === where.id,
        );
        return r ? withCount(r) : null;
      },
      upsert: async ({
        where,
        update,
        create,
      }: {
        where: { publishOn: Date };
        update: Partial<Row>;
        create: Omit<Row, 'id' | 'reads'>;
      }) => {
        const r = store.find((x) => x.publishOn.getTime() === where.publishOn.getTime());
        if (r) {
          Object.assign(r, update);
          return r;
        }
        const created = { id: `d-${store.length}`, reads: 0, ...create };
        store.push(created);
        return created;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const i = store.findIndex((x) => x.id === where.id);
        store.splice(i, 1);
      },
    },
  };
  const service = new DevotionalService(prisma as never, {} as never);
  return { service, store };
}

const row = (id: string, offset: number, reads = 0): Row => ({
  id,
  publishOn: day(offset),
  reference: 'Salmo 1',
  title: 'T',
  body: 'b'.repeat(60),
  question: 'q'.repeat(20),
  reads,
});

describe('runwayDays — días consecutivos desde hoy', () => {
  it('cuenta hoy y los siguientes mientras no haya hueco', async () => {
    const { service } = buildService([row('a', 0), row('b', 1), row('c', 2)]);

    expect(await service.runwayDays(NOW)).toBe(3);
  });

  it('un hueco corta la reserva aunque haya más después', async () => {
    // Hoy y mañana sí; pasado no; el siguiente sí. La reserva es 2, porque
    // pasado mañana la app ya estaría repitiendo el último.
    const { service } = buildService([row('a', 0), row('b', 1), row('d', 3)]);

    expect(await service.runwayDays(NOW)).toBe(2);
  });

  it('sin el de hoy, la reserva es cero aunque haya futuros', async () => {
    const { service } = buildService([row('b', 1), row('c', 2)]);

    expect(await service.runwayDays(NOW)).toBe(0);
  });

  it('los pasados no cuentan', async () => {
    const { service } = buildService([row('z', -3), row('y', -1)]);

    expect(await service.runwayDays(NOW)).toBe(0);
  });
});

describe('upsertForDate — escribir o corregir', () => {
  it('crea el de una fecha nueva', async () => {
    const { service, store } = buildService([]);

    const result = await service.upsertForDate('2026-09-03', {
      reference: 'Rut 1:16',
      title: 'Donde tú vayas',
      body: 'b'.repeat(60),
      question: 'q'.repeat(20),
    });

    expect(result.created).toBe(true);
    expect(store).toHaveLength(1);
  });

  it('corrige uno programado que nadie ha leído', async () => {
    const { service, store } = buildService([row('a', 2)]);

    const result = await service.upsertForDate('2026-09-02', {
      reference: 'Rut 1:16',
      title: 'Corregido',
      body: 'b'.repeat(60),
      question: 'q'.repeat(20),
    });

    expect(result.created).toBe(false);
    expect(store[0].title).toBe('Corregido');
  });

  it('no reescribe uno que alguien ya leyó', async () => {
    // Lo que esa persona leyó fue lo que leyó, y «27 de tu iglesia lo leyeron
    // hoy» tiene que seguir significando que leyeron lo mismo.
    const { service, store } = buildService([row('a', 0, 27)]);

    await expect(
      service.upsertForDate('2026-08-31', {
        reference: 'x',
        title: 'Otro',
        body: 'b'.repeat(60),
        question: 'q'.repeat(20),
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(store[0].title).toBe('T');
  });

  it('rechaza una fecha mal formada antes de tocar nada', async () => {
    const { service } = buildService([]);

    await expect(
      service.upsertForDate('31/08/2026', {
        reference: 'x',
        title: 'x',
        body: 'b'.repeat(60),
        question: 'q'.repeat(20),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('remove — quitar uno futuro', () => {
  it('borra uno que nadie leyó', async () => {
    const { service, store } = buildService([row('a', 3)]);

    await service.remove('a');

    expect(store).toHaveLength(0);
  });

  it('no borra uno ya leído', async () => {
    const { service, store } = buildService([row('a', -1, 100)]);

    await expect(service.remove('a')).rejects.toBeInstanceOf(ForbiddenException);
    expect(store).toHaveLength(1);
  });

  it('uno que no existe da 404', async () => {
    const { service } = buildService([]);

    await expect(service.remove('nada')).rejects.toBeInstanceOf(NotFoundException);
  });
});
