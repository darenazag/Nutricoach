import type { RequestHandler } from 'express';
import {
  AI_CONVERSATIONS_LIST_DEFAULT_LIMIT,
  AI_CONVERSATIONS_LIST_DEFAULT_PAGE,
  getAiConversationById,
  listAiConversationsForUser,
} from '../services/index.js';

export const getAiConversation: RequestHandler = async (req, res, next) => {
  try {
    // Ownership scope: only the authenticated user can read their conversation.
    // A conversation that belongs to another user is reported as not_found,
    // never as forbidden, to avoid leaking which IDs exist.
    const conversationId = req.params['conversationId'] as string;
    const userId = String(req.auth!.sub);
    const result = await getAiConversationById(conversationId, userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Parses an `?page` or `?limit` query value:
 *   - undefined / empty / missing → fallback
 *   - non-numeric string         → NaN (let the service raise validation_error)
 *   - numeric string             → integer
 *
 * We do NOT cap `limit` here. The service rejects limit > 50 with
 * validation_error so the client cannot silently get a clamped page.
 */
function parsePositiveInt(raw: unknown, fallback: number): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = Number(raw);
  // Service will validate Number.isInteger and bounds; we only do the coercion.
  return n;
}

export const listAiConversations: RequestHandler = async (req, res, next) => {
  try {
    // userId is ALWAYS the authenticated subject; req.query.userId is ignored.
    const userId = String(req.auth!.sub);
    const page = parsePositiveInt(req.query['page'], AI_CONVERSATIONS_LIST_DEFAULT_PAGE);
    const limit = parsePositiveInt(req.query['limit'], AI_CONVERSATIONS_LIST_DEFAULT_LIMIT);
    const result = await listAiConversationsForUser(userId, { page, limit });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
