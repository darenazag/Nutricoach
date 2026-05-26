import { Router } from 'express';
import { postAiChat } from '../controllers/aiChat.controller.js';
import { postAiMenu } from '../controllers/aiMenu.controller.js';
import { postAiProfileExplanation } from '../controllers/aiProfileExplanation.controller.js';
import { handlePlateAnalysis } from '../controllers/aiPlateAnalysis.controller.js';
import { getAiConversation } from '../controllers/aiConversations.controller.js';
import {
  postAiWeeklyMenu,
  getAiWeeklyMenuPlan,
} from '../controllers/aiWeeklyMenu.controller.js';
import {
  handleAnalyze,
  handleAnalyzePreview,
} from '../controllers/aiLegacyAnalyze.controller.js';

export const aiRouter: Router = Router();

// POST /api/ai/chat
aiRouter.post('/chat', postAiChat);

// POST /api/ai/menu/weekly — must be before /menu to avoid Express route ambiguity
aiRouter.post('/menu/weekly', postAiWeeklyMenu);

// GET /api/ai/menu/weekly/:planId
aiRouter.get('/menu/weekly/:planId', getAiWeeklyMenuPlan);

// POST /api/ai/menu
aiRouter.post('/menu', postAiMenu);

// POST /api/ai/profile-explanation
aiRouter.post('/profile-explanation', postAiProfileExplanation);

// POST /api/ai/plate-analysis  — multipart/form-data with field "image"
aiRouter.post('/plate-analysis', ...handlePlateAnalysis);

// GET /api/ai/conversations/:conversationId
aiRouter.get('/conversations/:conversationId', getAiConversation);

// Legacy adapters — frontend calls these endpoints directly
// POST /api/ai/analyze        — AIBubble.tsx (only checks res.ok)
// POST /api/ai/analyze-preview — RegistrarComida.tsx (reads { analysis: {...} })
aiRouter.post('/analyze', ...handleAnalyze);
aiRouter.post('/analyze-preview', ...handleAnalyzePreview);
