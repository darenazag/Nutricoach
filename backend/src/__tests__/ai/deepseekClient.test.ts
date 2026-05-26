import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateDeepSeekJson } from '../../modules/ai/providers/deepseekClient.js';

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeOkFetch(content: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: vi.fn().mockResolvedValue({
      choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
    }),
  });
}

function makeErrorFetch(status: number, statusText: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: vi.fn().mockResolvedValue({ error: { message: statusText } }),
  });
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('generateDeepSeekJson', () => {
  let savedApiKey: string | undefined;

  beforeEach(() => {
    savedApiKey = process.env['DEEPSEEK_API_KEY'];
    process.env['DEEPSEEK_API_KEY'] = 'sk-test-key';
  });

  afterEach(() => {
    if (savedApiKey === undefined) {
      delete process.env['DEEPSEEK_API_KEY'];
    } else {
      process.env['DEEPSEEK_API_KEY'] = savedApiKey;
    }
    vi.unstubAllGlobals();
  });

  it('throws missing_api_key when DEEPSEEK_API_KEY is absent', async () => {
    delete process.env['DEEPSEEK_API_KEY'];

    await expect(
      generateDeepSeekJson({ systemPrompt: 'sys', userPrompt: 'usr' }),
    ).rejects.toMatchObject({ name: 'AiProviderError', code: 'missing_api_key' });
  });

  it('returns parsed JSON and correct metadata on success', async () => {
    const payload = { calories: 2000, meals: ['breakfast', 'lunch'] };
    vi.stubGlobal('fetch', makeOkFetch(JSON.stringify(payload)));

    const result = await generateDeepSeekJson<typeof payload>({
      systemPrompt: 'You are a nutrition assistant.',
      userPrompt: 'Give me a daily plan.',
    });

    expect(result.parsed).toEqual(payload);
    expect(result.text).toBe(JSON.stringify(payload));
    expect(result.metadata.provider).toBe('deepseek');
    expect(result.metadata.cached).toBe(false);
    expect(typeof result.metadata.model).toBe('string');
  });

  it('includes system and user messages in the fetch body', async () => {
    const mockFetch = makeOkFetch(JSON.stringify({ ok: true }));
    vi.stubGlobal('fetch', mockFetch);

    await generateDeepSeekJson({ systemPrompt: 'SYSTEM', userPrompt: 'USER' });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      messages: Array<{ role: string; content: string }>;
      response_format: { type: string };
    };
    expect(body.messages).toContainEqual({ role: 'system', content: 'SYSTEM' });
    expect(body.messages).toContainEqual({ role: 'user', content: 'USER' });
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('throws provider_error on HTTP 500', async () => {
    vi.stubGlobal('fetch', makeErrorFetch(500, 'Internal Server Error'));

    await expect(
      generateDeepSeekJson({ systemPrompt: 'sys', userPrompt: 'usr' }),
    ).rejects.toMatchObject({ name: 'AiProviderError', code: 'provider_error' });
  });

  it('throws provider_error when fetch itself throws (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(
      generateDeepSeekJson({ systemPrompt: 'sys', userPrompt: 'usr' }),
    ).rejects.toMatchObject({ name: 'AiProviderError', code: 'provider_error' });
  });

  it('throws json_parse_error when choices content is not valid JSON', async () => {
    vi.stubGlobal('fetch', makeOkFetch('this is definitely not json {{{'));

    await expect(
      generateDeepSeekJson({ systemPrompt: 'sys', userPrompt: 'usr' }),
    ).rejects.toMatchObject({ name: 'AiProviderError', code: 'json_parse_error' });
  });

  it('throws invalid_response when choices content is empty', async () => {
    vi.stubGlobal('fetch', makeOkFetch(''));

    await expect(
      generateDeepSeekJson({ systemPrompt: 'sys', userPrompt: 'usr' }),
    ).rejects.toMatchObject({ name: 'AiProviderError', code: 'invalid_response' });
  });
});
