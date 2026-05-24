import type { RequestHandler } from 'express';
import { getAiConversationById } from '../services/index.js';

export const getAiConversation: RequestHandler = async (req, res, next) => {
  try {
    const result = await getAiConversationById(req.params['conversationId'] as string);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
