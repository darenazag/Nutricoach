import type { RequestHandler } from 'express';
import { createWeeklyMenuPlan, getWeeklyMenuPlanById } from '../services/index.js';

/**
 * POST /api/ai/menu/weekly
 *
 * Creates an async weekly menu plan. Responds immediately with 202 Accepted
 * while background generation continues. Poll GET /api/ai/menu/weekly/:planId
 * for progress.
 */
export const postAiWeeklyMenu: RequestHandler = async (req, res, next) => {
  try {
    const result = await createWeeklyMenuPlan(req.body);
    res.status(202).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ai/menu/weekly/:planId
 *
 * Returns the current state of a weekly menu plan including per-day progress.
 * Returns 404 if the planId is not found.
 */
export const getAiWeeklyMenuPlan: RequestHandler = async (req, res, next) => {
  try {
    const planId = req.params['planId'] as string;
    const result = await getWeeklyMenuPlanById(planId ?? '');
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
