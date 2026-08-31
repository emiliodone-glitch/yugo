import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RelationshipService } from './relationship.service';

/**
 * The rules that only exist at the service level: who may accept, what a
 * missing proposal does, and the one case where proposing is really agreeing.
 * The ordering rules themselves live in @yugo/shared and are tested there.
 */

const ME = 'u-me';
const THEM = 'u-them';

interface FakeMatch {
  id: string;
  userAId: string;
  userBId: string;
  status: string;
  stage: string;
  stageChangedAt: Date | null;
  proposedStage: string | null;
  proposedById: string | null;
  proposedAt: Date | null;
}

function buildService(overrides: Partial<FakeMatch> = {}) {
  const match: FakeMatch = {
    id: 'm1',
    userAId: ME,
    userBId: THEM,
    status: 'ACTIVE',
    stage: 'KNOWING',
    stageChangedAt: null,
    proposedStage: null,
    proposedById: null,
    proposedAt: null,
    ...overrides,
  };

  const stageChanges: Array<Record<string, unknown>> = [];
  const prisma = {
    match: {
      findUnique: jest.fn(async () => ({
        ...match,
        userA: { profile: { displayName: 'Yo' } },
        userB: { profile: { displayName: 'Mariel' } },
        conversation: { id: 'c1' },
      })),
      update: jest.fn(async ({ data }: { data: Partial<FakeMatch> }) => {
        Object.assign(match, data);
        return match;
      }),
    },
    relationshipStageChange: {
      findMany: jest.fn(async () => stageChanges),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        stageChanges.push(data);
        return data;
      }),
    },
    // The service batches the update and the history row; running them in
    // order is enough for these assertions.
    $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  };

  const notifications = {
    notify: jest.fn(async (..._args: unknown[]) => undefined),
  };
  const audit = { log: jest.fn(async () => undefined) };

  const service = new RelationshipService(
    prisma as never,
    notifications as never,
    audit as never,
  );
  return { service, match, prisma, notifications, audit };
}

describe('RelationshipService', () => {
  it('a proposal changes nothing until the other person accepts', async () => {
    const { service, match, notifications } = buildService();
    await service.propose('m1', ME, 'INTENTIONAL_FRIENDSHIP');

    expect(match.stage).toBe('KNOWING');
    expect(match.proposedStage).toBe('INTENTIONAL_FRIENDSHIP');
    expect(match.proposedById).toBe(ME);
    // Only the other person is told; nobody needs a notice about their own tap.
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify.mock.calls[0][0]).toBe(THEM);
  });

  it('nobody can accept their own proposal', async () => {
    const { service } = buildService({
      proposedStage: 'INTENTIONAL_FRIENDSHIP',
      proposedById: ME,
    });
    await expect(service.accept('m1', ME)).rejects.toThrow(BadRequestException);
  });

  it('accepting advances the stage and records it in the history', async () => {
    const { service, match, prisma } = buildService({
      proposedStage: 'INTENTIONAL_FRIENDSHIP',
      proposedById: THEM,
    });
    const result = await service.accept('m1', ME);

    expect(result.stage).toBe('INTENTIONAL_FRIENDSHIP');
    expect(result.advanced).toBe(true);
    expect(result.isExclusive).toBe(false);
    expect(match.proposedStage).toBeNull();
    expect(prisma.relationshipStageChange.create).toHaveBeenCalledWith({
      data: {
        matchId: 'm1',
        fromStage: 'KNOWING',
        toStage: 'INTENTIONAL_FRIENDSHIP',
        proposedById: THEM,
        acceptedById: ME,
      },
    });
  });

  it('declarar noviazgo queda auditado, porque saca a los dos de Descubrir', async () => {
    const { service, audit } = buildService({
      stage: 'INTENTIONAL_FRIENDSHIP',
      proposedStage: 'COURTSHIP',
      proposedById: THEM,
    });
    const result = await service.accept('m1', ME);

    expect(result.isExclusive).toBe(true);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RELATIONSHIP_EXCLUSIVE', targetId: 'm1' }),
    );
  });

  it('proposing the same stage the other person already proposed is agreeing', async () => {
    // Two people tapping the same button within the same minute should end up
    // engaged, not deadlocked waiting on each other.
    const { service, match } = buildService({
      proposedStage: 'INTENTIONAL_FRIENDSHIP',
      proposedById: THEM,
    });
    await service.propose('m1', ME, 'INTENTIONAL_FRIENDSHIP');

    expect(match.stage).toBe('INTENTIONAL_FRIENDSHIP');
    expect(match.proposedStage).toBeNull();
  });

  it('refuses to skip a stage', async () => {
    const { service } = buildService();
    await expect(service.propose('m1', ME, 'COURTSHIP')).rejects.toThrow(BadRequestException);
  });

  it('declining clears the proposal without ending anything', async () => {
    const { service, match, notifications } = buildService({
      proposedStage: 'COURTSHIP',
      proposedById: THEM,
      stage: 'INTENTIONAL_FRIENDSHIP',
    });
    await service.decline('m1', ME);

    expect(match.proposedStage).toBeNull();
    expect(match.stage).toBe('INTENTIONAL_FRIENDSHIP');
    expect(match.status).toBe('ACTIVE');
    expect(notifications.notify.mock.calls[0][0]).toBe(THEM);
  });

  it('accepting with nothing pending is a bad request, not a silent no-op', async () => {
    const { service } = buildService();
    await expect(service.accept('m1', ME)).rejects.toThrow(BadRequestException);
  });

  it('a stranger cannot read or move someone else’s bond', async () => {
    const { service } = buildService();
    await expect(service.state('m1', 'u-stranger')).rejects.toThrow(NotFoundException);
    await expect(service.propose('m1', 'u-stranger', 'INTENTIONAL_FRIENDSHIP')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('an ended connection has no stage to move', async () => {
    const { service } = buildService({ status: 'ENDED' });
    await expect(service.propose('m1', ME, 'INTENTIONAL_FRIENDSHIP')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('state reports the only proposable stage and who is waiting on whom', async () => {
    const { service } = buildService({
      stage: 'INTENTIONAL_FRIENDSHIP',
      proposedStage: 'COURTSHIP',
      proposedById: ME,
    });
    const state = await service.state('m1', ME);

    expect(state.stage).toBe('INTENTIONAL_FRIENDSHIP');
    expect(state.nextStage).toBe('COURTSHIP');
    expect(state.isExclusive).toBe(false);
    expect(state.proposal).toMatchObject({ stage: 'COURTSHIP', byMe: true });
    expect(state.otherName).toBe('Mariel');
  });
});
