/**
 * Adapter: P0 PostgreSQL profile → AI plate-analysis context.
 *
 * The legacy `/api/ai/analyze*` endpoints used to hard-code `userId: 'legacy_adapter'`
 * and skip the user's nutrition context entirely. This adapter bridges the P0
 * (PostgreSQL/Sequelize) profile model with the AI plate-analysis service so
 * that the model can personalise its answer with the user's objective and
 * calorie target.
 *
 * It is intentionally tolerant: any failure reading the profile is swallowed
 * and a minimal context is returned. Plate analysis must NEVER fail because
 * the P0 database is down — the IA flow has to keep working in degraded mode.
 */
import * as profileModel from '../../../models/profileModel.js';

export interface AiPlateContext {
  userId: string;
  objective?: 'lose_weight' | 'maintain' | 'gain_muscle';
  caloriesTarget?: number;
  plan: 'free';
}

// P0 stores the objective as a single char in PostgreSQL.
// 'P' = Perder, 'M' = Mantener, 'G' = Ganar.
const OBJECTIVE_MAP: Record<string, 'lose_weight' | 'maintain' | 'gain_muscle'> = {
  P: 'lose_weight',
  M: 'maintain',
  G: 'gain_muscle',
};

/**
 * Builds the AI plate-analysis context for a P0 user.
 *
 * Behaviour:
 *  - Always returns a context (never throws).
 *  - userId is always coerced to string (AI service expects string IDs).
 *  - plan is always 'free' in this MVP; pro/free differentiation will be
 *    introduced later via rate-limit middleware, not here.
 *  - objective is only set when the P0 char maps to a known IA objective.
 *  - caloriesTarget is only set when TDEE is a finite positive number.
 */
export async function buildAiPlateContextFromP0User(
  userId: number,
): Promise<AiPlateContext> {
  const profile = await profileModel.findById(userId).catch(() => null);

  if (!profile) {
    return { userId: String(userId), plan: 'free' };
  }

  const ctx: AiPlateContext = {
    userId: String(userId),
    plan: 'free',
  };

  const mappedObjective = OBJECTIVE_MAP[String(profile.objective)];
  if (mappedObjective) {
    ctx.objective = mappedObjective;
  }

  const tdee = Number(profile.totalDailyEnergyExpenditure);
  if (Number.isFinite(tdee) && tdee > 0) {
    ctx.caloriesTarget = tdee;
  }

  return ctx;
}
