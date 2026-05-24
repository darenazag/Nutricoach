import type { RequestHandler } from 'express';
import { runAiProfileExplanation } from '../services/index.js';

/**
 * POST /api/ai/profile-explanation
 *
 * Thin HTTP wrapper: forwards `req.body` to `runAiProfileExplanation`,
 * returns the result under `{ success: true, data }`, and delegates all
 * error handling to the global error middleware via `next(err)`.
 *
 * No business logic, no validation here — the service already validates with
 * `aiProfileExplanationRequestSchema` and throws typed `AiServiceError`s.
 */
export const postAiProfileExplanation: RequestHandler = async (req, res, next) => {
  try {
    const result = await runAiProfileExplanation(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
