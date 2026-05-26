import type { RequestHandler } from 'express';
import { runAiChat } from '../services/index.js';

/**
 * POST /api/ai/chat
 *
 * Thin HTTP wrapper: forwards `req.body` to `runAiChat`, returns the result
 * under `{ success: true, data }`, and delegates all error handling to the
 * global error middleware via `next(err)`.
 *
 * No business logic, no validation here — the service already validates with
 * `aiChatRequestSchema` and throws typed `AiServiceError`s.
 */
export const postAiChat: RequestHandler = async (req, res, next) => {
  try {
    const result = await runAiChat(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
