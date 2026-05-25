import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock providers BEFORE any service import (vi.mock is hoisted by Vitest).
vi.mock('../../modules/ai/providers/index.js', () => {
  class AiProviderError extends Error {
    code: string;
    raw?: unknown;
    constructor(message: string, code: string, raw?: unknown) {
      super(message);
      this.name = 'AiProviderError';
      this.code = code;
      this.raw = raw;
    }
  }
  return {
    AiProviderError,
    generateGeminiJson: vi.fn(),
    generateGeminiJsonWithImage: vi.fn(),
    generateDeepSeekJson: vi.fn(),
    createGeminiClient: vi.fn(),
  };
});

import { generateTextJson, generateTextJsonWithFallback, generateImageJson } from '../../modules/ai/services/aiProviderRouter.service.js';
import { AiServiceError } from '../../modules/ai/services/aiServiceError.js';
import {
  generateGeminiJson,
  generateGeminiJsonWithImage,
  generateDeepSeekJson,
  AiProviderError,
} from '../../modules/ai/providers/index.js';

// ── Fixture ───────────────────────────────────────────────────────────────────

const GEMINI_RESPONSE = {
  text: '{"ok":true}',
  parsed: { ok: true },
  raw: {},
  metadata: { provider: 'gemini' as const, model: 'gemini-2.5-flash', cached: false as const },
};

const DEEPSEEK_RESPONSE = {
  text: '{"ok":true}',
  parsed: { ok: true },
  raw: {},
  metadata: { provider: 'deepseek' as const, model: 'deepseek-chat', cached: false as const },
};

const BASE_REQUEST = { systemPrompt: 'You are a nutrition assistant.', userPrompt: 'Give a plan.' };
const BASE_IMAGE_REQUEST = { ...BASE_REQUEST, imageBase64: 'abc123', mimeType: 'image/jpeg' };

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('generateTextJson', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {
      AI_ENABLE_DEEPSEEK: process.env['AI_ENABLE_DEEPSEEK'],
      AI_TEXT_PROVIDER: process.env['AI_TEXT_PROVIDER'],
    };
    delete process.env['AI_ENABLE_DEEPSEEK'];
    delete process.env['AI_TEXT_PROVIDER'];
    vi.mocked(generateGeminiJson).mockResolvedValue(GEMINI_RESPONSE);
    vi.mocked(generateDeepSeekJson).mockResolvedValue(DEEPSEEK_RESPONSE);
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    vi.clearAllMocks();
  });

  it('uses Gemini by default when no env vars are set', async () => {
    const result = await generateTextJson(BASE_REQUEST);

    expect(generateGeminiJson).toHaveBeenCalledOnce();
    expect(generateDeepSeekJson).not.toHaveBeenCalled();
    expect(result.metadata.provider).toBe('gemini');
  });

  it('uses Gemini when AI_ENABLE_DEEPSEEK=true but AI_TEXT_PROVIDER is unset', async () => {
    process.env['AI_ENABLE_DEEPSEEK'] = 'true';

    const result = await generateTextJson(BASE_REQUEST);

    expect(generateGeminiJson).toHaveBeenCalledOnce();
    expect(generateDeepSeekJson).not.toHaveBeenCalled();
    expect(result.metadata.provider).toBe('gemini');
  });

  it('uses Gemini when AI_TEXT_PROVIDER=deepseek but AI_ENABLE_DEEPSEEK is not true', async () => {
    process.env['AI_TEXT_PROVIDER'] = 'deepseek';
    process.env['AI_ENABLE_DEEPSEEK'] = 'false';

    const result = await generateTextJson(BASE_REQUEST);

    expect(generateGeminiJson).toHaveBeenCalledOnce();
    expect(generateDeepSeekJson).not.toHaveBeenCalled();
    expect(result.metadata.provider).toBe('gemini');
  });

  it('uses DeepSeek when AI_ENABLE_DEEPSEEK=true and AI_TEXT_PROVIDER=deepseek', async () => {
    process.env['AI_ENABLE_DEEPSEEK'] = 'true';
    process.env['AI_TEXT_PROVIDER'] = 'deepseek';

    const result = await generateTextJson(BASE_REQUEST);

    expect(generateDeepSeekJson).toHaveBeenCalledOnce();
    expect(generateGeminiJson).not.toHaveBeenCalled();
    expect(result.metadata.provider).toBe('deepseek');
  });

  it('falls back to Gemini when DeepSeek throws AiProviderError', async () => {
    process.env['AI_ENABLE_DEEPSEEK'] = 'true';
    process.env['AI_TEXT_PROVIDER'] = 'deepseek';
    vi.mocked(generateDeepSeekJson).mockRejectedValue(
      new AiProviderError('DeepSeek unavailable', 'provider_error'),
    );

    const result = await generateTextJson(BASE_REQUEST);

    expect(generateDeepSeekJson).toHaveBeenCalledOnce();
    expect(generateGeminiJson).toHaveBeenCalledOnce();
    expect(result.metadata.provider).toBe('gemini');
  });

  it('does NOT fall back — re-throws non-AiProviderError from DeepSeek', async () => {
    process.env['AI_ENABLE_DEEPSEEK'] = 'true';
    process.env['AI_TEXT_PROVIDER'] = 'deepseek';
    vi.mocked(generateDeepSeekJson).mockRejectedValue(new TypeError('unexpected null'));

    await expect(generateTextJson(BASE_REQUEST)).rejects.toThrow('unexpected null');
    expect(generateGeminiJson).not.toHaveBeenCalled();
  });
});

describe('generateImageJson', () => {
  beforeEach(() => {
    vi.mocked(generateGeminiJsonWithImage).mockResolvedValue(GEMINI_RESPONSE);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('always delegates to Gemini regardless of env vars', async () => {
    process.env['AI_ENABLE_DEEPSEEK'] = 'true';
    process.env['AI_TEXT_PROVIDER'] = 'deepseek';

    const result = await generateImageJson(BASE_IMAGE_REQUEST);

    expect(generateGeminiJsonWithImage).toHaveBeenCalledOnce();
    expect(generateDeepSeekJson).not.toHaveBeenCalled();
    expect(result.metadata.provider).toBe('gemini');

    delete process.env['AI_ENABLE_DEEPSEEK'];
    delete process.env['AI_TEXT_PROVIDER'];
  });
});

// ── generateTextJsonWithFallback ──────────────────────────────────────────────

describe('generateTextJsonWithFallback', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {
      AI_ENABLE_DEEPSEEK: process.env['AI_ENABLE_DEEPSEEK'],
      AI_TEXT_PROVIDER: process.env['AI_TEXT_PROVIDER'],
    };
    delete process.env['AI_ENABLE_DEEPSEEK'];
    delete process.env['AI_TEXT_PROVIDER'];
    vi.mocked(generateGeminiJson).mockResolvedValue(GEMINI_RESPONSE);
    vi.mocked(generateDeepSeekJson).mockResolvedValue(DEEPSEEK_RESPONSE);
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    vi.clearAllMocks();
  });

  it('returns Gemini result with validated data when Gemini is the provider', async () => {
    const validate = vi.fn().mockReturnValue({ ok: true });

    const result = await generateTextJsonWithFallback(BASE_REQUEST, validate);

    expect(generateGeminiJson).toHaveBeenCalledOnce();
    expect(validate).toHaveBeenCalledOnce();
    expect(result.metadata.provider).toBe('gemini');
    expect(result.parsed).toEqual({ ok: true });
  });

  it('returns DeepSeek result with validated data when DeepSeek passes validation', async () => {
    process.env['AI_ENABLE_DEEPSEEK'] = 'true';
    process.env['AI_TEXT_PROVIDER'] = 'deepseek';
    const validate = vi.fn().mockReturnValue({ ok: true });

    const result = await generateTextJsonWithFallback(BASE_REQUEST, validate);

    expect(generateDeepSeekJson).toHaveBeenCalledOnce();
    expect(generateGeminiJson).not.toHaveBeenCalled();
    expect(result.metadata.provider).toBe('deepseek');
    expect(result.parsed).toEqual({ ok: true });
  });

  it('falls back to Gemini when DeepSeek response fails schema validation', async () => {
    process.env['AI_ENABLE_DEEPSEEK'] = 'true';
    process.env['AI_TEXT_PROVIDER'] = 'deepseek';

    const validationError = new AiServiceError('AI response failed Zod validation.', 'validation_error', {});
    const validate = vi.fn()
      .mockImplementationOnce(() => { throw validationError; })  // DeepSeek fails
      .mockReturnValueOnce({ ok: true });                        // Gemini passes

    const result = await generateTextJsonWithFallback(BASE_REQUEST, validate);

    expect(generateDeepSeekJson).toHaveBeenCalledOnce();
    expect(generateGeminiJson).toHaveBeenCalledOnce();
    expect(validate).toHaveBeenCalledTimes(2);
    expect(result.metadata.provider).toBe('gemini');
    expect(result.parsed).toEqual({ ok: true });
  });

  it('rethrows validation_error if Gemini also fails schema validation', async () => {
    process.env['AI_ENABLE_DEEPSEEK'] = 'true';
    process.env['AI_TEXT_PROVIDER'] = 'deepseek';

    const validate = vi.fn().mockImplementation(() => {
      throw new AiServiceError('AI response failed Zod validation.', 'validation_error', {});
    });

    await expect(generateTextJsonWithFallback(BASE_REQUEST, validate)).rejects.toMatchObject({
      name: 'AiServiceError',
      code: 'validation_error',
    });
    expect(generateDeepSeekJson).toHaveBeenCalledOnce();
    expect(generateGeminiJson).toHaveBeenCalledOnce();
    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('does not fall back when Gemini is the primary provider and validation fails', async () => {
    // Default env: AI_ENABLE_DEEPSEEK not set → Gemini
    const validate = vi.fn().mockImplementation(() => {
      throw new AiServiceError('AI response failed Zod validation.', 'validation_error', {});
    });

    await expect(generateTextJsonWithFallback(BASE_REQUEST, validate)).rejects.toMatchObject({
      name: 'AiServiceError',
      code: 'validation_error',
    });
    expect(generateGeminiJson).toHaveBeenCalledOnce();
    expect(validate).toHaveBeenCalledOnce(); // no retry
  });

  it('does not swallow non-validation errors from the validator', async () => {
    process.env['AI_ENABLE_DEEPSEEK'] = 'true';
    process.env['AI_TEXT_PROVIDER'] = 'deepseek';

    const buggyValidate = vi.fn().mockImplementation(() => {
      throw new TypeError('unexpected null in validator');
    });

    await expect(generateTextJsonWithFallback(BASE_REQUEST, buggyValidate)).rejects.toThrow(
      'unexpected null in validator',
    );
    expect(generateGeminiJson).not.toHaveBeenCalled(); // not a validation_error, no fallback
  });
});
