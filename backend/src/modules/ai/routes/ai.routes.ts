import { Router } from 'express';
import { postAiChat } from '../controllers/aiChat.controller.js';
import { handlePlateAnalysis } from '../controllers/aiPlateAnalysis.controller.js';

export const aiRouter: Router = Router();

// POST /api/ai/chat
aiRouter.post('/chat', postAiChat);

// POST /api/ai/plate-analysis  — multipart/form-data with field "image"
aiRouter.post('/plate-analysis', ...handlePlateAnalysis);
