export type AiProviderName = 'gemini' | 'deepseek';

export interface AiProviderRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AiProviderJsonResponse<T = unknown> {
  text: string;
  parsed: T | null;
  raw: unknown;
  metadata: {
    provider: AiProviderName;
    model: string;
    cached: false;
  };
}

/**
 * Extended request type for providers that support image input.
 * Image capability is NOT universal — currently only Gemini implements this.
 * Text-only providers (e.g. DeepSeek) accept AiProviderRequest instead.
 */
export interface AiProviderImageRequest {
  systemPrompt: string;
  userPrompt: string;
  imageBuffer: Buffer;
  mimeType: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export type AiProviderErrorCode =
  | 'missing_api_key'
  | 'invalid_response'
  | 'provider_error'
  | 'json_parse_error';

/**
 * Thrown by the AI provider layer.
 * The service layer is responsible for catching this and deciding how to handle each code.
 */
export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;

  constructor(message: string, code: AiProviderErrorCode, cause?: unknown) {
    // Error.cause is available in ES2022+ (Node 16.9+)
    super(message, { cause });
    this.name = 'AiProviderError';
    this.code = code;
  }
}
