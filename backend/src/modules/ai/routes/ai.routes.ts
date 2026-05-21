import { Router } from 'express';
import { postAiChat } from '../controllers/aiChat.controller.js';

export const aiRouter: Router = Router();

// Mounted at /api/ai in app.ts -> final URL is POST /api/ai/chat
aiRouter.post('/chat', postAiChat);
