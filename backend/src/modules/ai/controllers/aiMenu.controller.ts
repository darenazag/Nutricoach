import type { RequestHandler } from 'express';
import { runAiMenu } from '../services/index.js';

/**
 * POST /api/ai/menu
 *
 * Thin HTTP wrapper: forwards `req.body` to `runAiMenu`, returns the result
 * under `{ success: true, data }`, and delegates all error handling to the
 * global error middleware via `next(err)`.
 *
 * No business logic, no validation here — the service already validates with
 * `aiMenuRequestSchema` and throws typed `AiServiceError`s.
 */
export const postAiMenu: RequestHandler = async (req, res, next) => {
  try {
    const result = await runAiMenu(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
