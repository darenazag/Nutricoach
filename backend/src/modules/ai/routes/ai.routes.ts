import { Router } from 'express';
import { postAiChat } from '../controllers/aiChat.controller.js';
import { postAiMenu } from '../controllers/aiMenu.controller.js';
import { postAiProfileExplanation } from '../controllers/aiProfileExplanation.controller.js';
import { handlePlateAnalysis } from '../controllers/aiPlateAnalysis.controller.js';
import { getAiConversation } from '../controllers/aiConversations.controller.js';

export const aiRouter: Router = Router();

// POST /api/ai/chat
aiRouter.post('/chat', postAiChat);

// POST /api/ai/menu
aiRouter.post('/menu', postAiMenu);

// POST /api/ai/profile-explanation
aiRouter.post('/profile-explanation', postAiProfileExplanation);

// POST /api/ai/plate-analysis  — multipart/form-data with field "image"
aiRouter.post('/plate-analysis', ...handlePlateAnalysis);

// GET /api/ai/conversations/:conversationId
aiRouter.get('/conversations/:conversationId', getAiConversation);
