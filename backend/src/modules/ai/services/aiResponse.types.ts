import { z } from 'zod';
import {
  aiChatRequestSchema,
  aiChatResponseSchema,
  aiMenuRequestSchema,
  aiMenuResponseSchema,
  aiPlateAnalysisRequestSchema,
  aiPlateAnalysisResponseSchema,
} from '../schemas/index.js';
import type { AiProvider } from '../types/index.js';

export type AiChatRequest = z.infer<typeof aiChatRequestSchema>;
export type AiChatResponse = z.infer<typeof aiChatResponseSchema>;

export type AiMenuRequest = z.infer<typeof aiMenuRequestSchema>;
export type AiMenuResponse = z.infer<typeof aiMenuResponseSchema>;

export type AiPlateAnalysisRequest = z.infer<typeof aiPlateAnalysisRequestSchema>;
export type AiPlateAnalysisResponse = z.infer<typeof aiPlateAnalysisResponseSchema>;

export interface AiServiceMetadata {
  provider: AiProvider;
  model: string;
  promptVersion: string;
  cached: boolean;
}

export interface AiServiceResult<TStructuredData> {
  responseText: string;
  structuredData: TStructuredData;
  metadata: AiServiceMetadata;
}
