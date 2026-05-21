import {
  defaultAiPromptTemplates,
  type DefaultAiPromptTemplate,
} from '../prompts/index.js';
import { AiServiceError } from './aiServiceError.js';

/**
 * Looks up a prompt template by `promptKey` in the local defaults.
 *
 * MongoDB-backed lookup will come in a later feature: this layer will then
 * try the active template in Mongo first and fall back to the local defaults
 * if Mongo is unavailable or no row is active.
 *
 * Throws AiServiceError('prompt_not_found') if no matching key is registered.
 */
export function getDefaultPromptTemplate(promptKey: string): DefaultAiPromptTemplate {
  const template = defaultAiPromptTemplates.find((t) => t.promptKey === promptKey);
  if (!template) {
    throw new AiServiceError(
      `No prompt template registered for promptKey "${promptKey}".`,
      'prompt_not_found',
      { details: { promptKey } },
    );
  }
  return template;
}
