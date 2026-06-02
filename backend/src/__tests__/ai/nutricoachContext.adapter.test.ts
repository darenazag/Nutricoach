import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Profile } from '../../types/domain.js';

// Mock the P0 profile model before importing the adapter under test.
vi.mock('../../models/profileModel.js', () => ({
  findById: vi.fn(),
}));

import * as profileModel from '../../models/profileModel.js';
import { buildAiPlateContextFromP0User } from '../../modules/ai/adapters/nutricoachContext.adapter.js';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    user_id: 123,
    weight: 70,
    age: 30,
    height: 175,
    gender: 'M',
    activityFactor: 'A',
    objective: 'P',
    basalMetabolicRate: 1600,
    totalDailyEnergyExpenditure: 2000,
    ...overrides,
  };
}

describe('buildAiPlateContextFromP0User', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps objective "P" → "lose_weight" and uses TDEE as caloriesTarget', async () => {
    vi.mocked(profileModel.findById).mockResolvedValue(
      makeProfile({ objective: 'P', totalDailyEnergyExpenditure: 2000 }),
    );
    const ctx = await buildAiPlateContextFromP0User(123);
    expect(ctx.objective).toBe('lose_weight');
    expect(ctx.caloriesTarget).toBe(2000);
  });

  it('maps objective "M" → "maintain"', async () => {
    vi.mocked(profileModel.findById).mockResolvedValue(
      makeProfile({ objective: 'M' }),
    );
    const ctx = await buildAiPlateContextFromP0User(123);
    expect(ctx.objective).toBe('maintain');
  });

  it('maps objective "G" → "gain_muscle"', async () => {
    vi.mocked(profileModel.findById).mockResolvedValue(
      makeProfile({ objective: 'G' }),
    );
    const ctx = await buildAiPlateContextFromP0User(123);
    expect(ctx.objective).toBe('gain_muscle');
  });

  it('returns minimum context when no profile is found', async () => {
    vi.mocked(profileModel.findById).mockResolvedValue(null);
    const ctx = await buildAiPlateContextFromP0User(123);
    expect(ctx).toEqual({ userId: '123', plan: 'free' });
  });

  it('returns minimum context (no throw) when profileModel.findById fails', async () => {
    vi.mocked(profileModel.findById).mockRejectedValue(new Error('DB down'));
    const ctx = await buildAiPlateContextFromP0User(123);
    expect(ctx).toEqual({ userId: '123', plan: 'free' });
  });

  it('omits caloriesTarget when TDEE is 0', async () => {
    vi.mocked(profileModel.findById).mockResolvedValue(
      makeProfile({ totalDailyEnergyExpenditure: 0 }),
    );
    const ctx = await buildAiPlateContextFromP0User(123);
    expect(ctx.caloriesTarget).toBeUndefined();
  });

  it('omits caloriesTarget when TDEE is negative', async () => {
    vi.mocked(profileModel.findById).mockResolvedValue(
      makeProfile({ totalDailyEnergyExpenditure: -500 }),
    );
    const ctx = await buildAiPlateContextFromP0User(123);
    expect(ctx.caloriesTarget).toBeUndefined();
  });

  it('omits caloriesTarget when TDEE is NaN', async () => {
    vi.mocked(profileModel.findById).mockResolvedValue(
      // NaN can legitimately come from a corrupted numeric in PostgreSQL.
      makeProfile({ totalDailyEnergyExpenditure: Number.NaN }),
    );
    const ctx = await buildAiPlateContextFromP0User(123);
    expect(ctx.caloriesTarget).toBeUndefined();
  });

  it('always sets plan to "free" (both with and without profile)', async () => {
    vi.mocked(profileModel.findById).mockResolvedValue(makeProfile({}));
    const withProfile = await buildAiPlateContextFromP0User(123);
    expect(withProfile.plan).toBe('free');

    vi.mocked(profileModel.findById).mockResolvedValue(null);
    const withoutProfile = await buildAiPlateContextFromP0User(123);
    expect(withoutProfile.plan).toBe('free');
  });

  it('always coerces userId to string (with and without profile)', async () => {
    vi.mocked(profileModel.findById).mockResolvedValue(makeProfile({}));
    const a = await buildAiPlateContextFromP0User(123);
    expect(typeof a.userId).toBe('string');
    expect(a.userId).toBe('123');

    vi.mocked(profileModel.findById).mockResolvedValue(null);
    const b = await buildAiPlateContextFromP0User(456);
    expect(typeof b.userId).toBe('string');
    expect(b.userId).toBe('456');
  });
});
