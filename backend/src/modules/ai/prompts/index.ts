export {
  AI_CHAT_PROMPT_KEY,
  AI_MENU_PROMPT_KEY,
  AI_PLATE_ANALYSIS_PROMPT_KEY,
  AI_PROMPT_VERSION,
} from './promptVersions.js';

export {
  aiChatSystemPrompt,
  aiChatUserPromptTemplate,
  aiChatPromptTemplate,
} from './aiChat.prompt.js';

export {
  aiMenuSystemPrompt,
  aiMenuUserPromptTemplate,
  aiMenuPromptTemplate,
} from './aiMenu.prompt.js';

export {
  aiPlateAnalysisSystemPrompt,
  aiPlateAnalysisUserPromptTemplate,
  aiPlateAnalysisPromptTemplate,
} from './aiPlateAnalysis.prompt.js';

export {
  defaultAiPromptTemplates,
  type DefaultAiPromptTemplate,
} from './defaultPromptTemplates.js';

export {
  renderPromptTemplate,
  extractPromptVariables,
  findMissingPromptVariables,
  buildRenderedPrompt,
  type RenderPromptVariables,
  type BuildRenderedPromptInput,
  type BuildRenderedPromptOutput,
} from './renderPromptTemplate.js';
