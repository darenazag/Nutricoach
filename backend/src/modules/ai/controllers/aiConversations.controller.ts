import type { RequestHandler } from 'express';
import { getAiConversationById } from '../services/index.js';

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
