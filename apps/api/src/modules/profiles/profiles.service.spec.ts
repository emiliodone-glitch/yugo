import { ProfilesService } from './profiles.service';

/**
 * Guardar el perfil (RF-PER-08/10).
 *
 * Lo que protege: el rango de edad obligatorio siempre viaja en la rama
 * `create` del upsert. Prisma valida esa rama aunque la fila exista, así que
 * dejarla sin `ageMin`/`ageMax` cuando el perfil ya estaba creado hacía que
 * cada edición posterior (Completa tu perfil, cambiar la ocupación) fallara
 * con un 500 mientras el alta funcionaba y nadie lo notaba.
 */

const USER_ID = 'u-samuel';
const BIRTH_DATE = new Date(Date.UTC(1995, 0, 15));

function ageOf(date: Date): number {
  const now = new Date();
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < date.getUTCMonth() ||
    (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function build(existingProfile: boolean) {
  const upsert = jest.fn().mockResolvedValue({});
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: USER_ID, birthDate: BIRTH_DATE }) },
    profile: {
      upsert,
      // recomputeCompleteness + getMine after saving
      findUnique: jest.fn().mockResolvedValue(
        existingProfile
          ? {
              userId: USER_ID,
              displayName: 'Samuel',
              serviceAreas: [],
              answers: [],
              user: { birthDate: BIRTH_DATE, photos: [] },
            }
          : null,
      ),
      update: jest.fn().mockResolvedValue({}),
    },
    serviceArea: { findMany: jest.fn().mockResolvedValue([]) },
    profileServiceArea: {
      deleteMany: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({}),
    },
  };
  const settings = {
    getLimits: jest.fn().mockResolvedValue({ ageRangeDefaultOffsets: [-5, 7] }),
  };
  const service = new ProfilesService(prisma as never, settings as never);
  return { service, upsert };
}

describe('ProfilesService.upsert', () => {
  it('lleva el rango de edad en create aunque el perfil ya exista', async () => {
    const { service, upsert } = build(true);

    await service.upsert(USER_ID, { occupation: 'Ingeniero de software' } as never);

    const call = upsert.mock.calls[0][0];
    const age = ageOf(BIRTH_DATE);
    expect(call.update).toEqual({ occupation: 'Ingeniero de software' });
    expect(call.create).toMatchObject({
      userId: USER_ID,
      occupation: 'Ingeniero de software',
      displayName: 'Miembro',
      ageMin: age - 5,
      ageMax: age + 7,
    });
  });

  it('nunca baja de 18 el mínimo por defecto y respeta el nombre enviado', async () => {
    const { service, upsert } = build(false);
    const young = new Date();
    young.setUTCFullYear(young.getUTCFullYear() - 19);
    (service as unknown as { prisma: { user: { findUnique: jest.Mock } } }).prisma.user.findUnique =
      jest.fn().mockResolvedValue({ id: USER_ID, birthDate: young });

    await service.upsert(USER_ID, { displayName: 'Lía' } as never);

    const call = upsert.mock.calls[0][0];
    expect(call.create.displayName).toBe('Lía');
    expect(call.create.ageMin).toBe(18);
    expect(call.create.ageMax).toBe(19 + 7);
  });
});
