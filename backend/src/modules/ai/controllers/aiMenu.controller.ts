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
    // userId always comes from the authenticated JWT (req.auth.sub).
    // Any body.userId sent by AI Lab or another client is ignored.
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await runAiMenu({ ...body, userId: String(req.auth!.sub) });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
