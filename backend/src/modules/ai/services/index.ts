export type {
  AiChatRequest,
  AiChatResponse,
  AiMenuRequest,
  AiMenuResponse,
  AiPlateAnalysisRequest,
  AiPlateAnalysisResponse,
  AiProfileExplanationRequest,
  AiProfileExplanationResponse,
  AiServiceMetadata,
  AiServiceResult,
} from './aiResponse.types.js';

export {
  AiServiceError,
  type AiServiceErrorCode,
} from './aiServiceError.js';

export { getDefaultPromptTemplate } from './aiPrompt.service.js';
export { validateAiResponse } from './aiValidation.service.js';
export { generateConversationId, generateMessageId } from './aiId.service.js';
export {
  buildCacheKey,
  getCacheTtlSeconds,
  storeCache,
  tryGetCached,
  type BuildCacheKeyInput,
  type StoreCacheInput,
} from './aiCache.service.js';
export { runAiChat, type AiChatServiceResult } from './aiChat.service.js';
export { runAiMenu, type AiMenuServiceResult } from './aiMenu.service.js';
export {
  runAiProfileExplanation,
  type AiProfileExplanationServiceResult,
} from './aiProfileExplanation.service.js';
export {
  runAiPlateAnalysis,
  type AiPlateAnalysisInput,
  type AiPlateAnalysisServiceResult,
} from './aiPlateAnalysis.service.js';
export {
  getAiConversationById,
  type GetAiConversationResult,
  type ConversationDto,
  type MessageDto,
} from './aiConversations.service.js';
export {
  createWeeklyMenuPlan,
  getWeeklyMenuPlanById,
  generateWeeklyMenuPlan,
  type CreateWeeklyMenuPlanResult,
  type WeeklyMenuPlanDto,
  type WeeklyMenuDayDto,
  type WeeklyMenuMealDto,
} from './aiWeeklyMenu.service.js';
