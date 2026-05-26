import { createHash } from 'node:crypto';
import {
  findCacheByKey,
  upsertCacheEntry,
  incrementCacheHit,
} from '../repositories/aiCache.repository.js';
import type { AiInteractionType, AiProvider } from '../types/index.js';

/**
 * Default TTL for cache entries when AI_CACHE_TTL_SECONDS is not set or invalid.
 * 24h is a sensible MVP default for one-shot endpoints (menu, profile-explanation)
 * where the same input is unlikely to change meaningfully in a day.
 */
const DEFAULT_CACHE_TTL_SECONDS = 86400;

/**
 * Reads `AI_CACHE_TTL_SECONDS` from the environment.
 * - Non-numeric / missing → returns DEFAULT_CACHE_TTL_SECONDS.
 * - 0 or negative → returned as-is; callers MUST interpret this as "permanent
 *   cache" (no expiresAt set, Mongo TTL won't sweep the document).
 */
export function getCacheTtlSeconds(): number {
  const raw = process.env['AI_CACHE_TTL_SECONDS'];
  if (raw === undefined || raw === '') return DEFAULT_CACHE_TTL_SECONDS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_CACHE_TTL_SECONDS;
  return parsed;
}

export interface BuildCacheKeyInput {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  promptVersion: string;
}

/**
 * Deterministic cache key derived from the rendered prompts + model + version.
 *
 * Two requests with identical (systemPrompt, userPrompt, model, promptVersion)
 * map to the same key — which is exactly what we want for one-shot endpoints
 * whose output depends only on those four inputs.
 *
 * Returns a hex sha256 (64 chars).
 */
export function buildCacheKey(input: BuildCacheKeyInput): string {
  const payload = JSON.stringify({
    systemPrompt: input.systemPrompt,
    userPrompt: input.userPrompt,
    model: input.model,
    promptVersion: input.promptVersion,
  });
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Looks up a cached AI JSON result by key.
 *
 * - Returns null if there is no entry.
 * - Returns null if the entry has expired (defensive runtime check on top of
 *   Mongo's TTL sweep, which can lag up to ~60s).
 * - On hit, best-effort increments `hitCount` (never propagates errors from
 *   the counter back to the caller).
 *
 * The result is typed as `T | null` but never validated here — the caller is
 * expected to re-run the same Zod schema it would use on a fresh Gemini
 * response, so a poisoned cache entry surfaces as `validation_error`.
 */
export async function tryGetCached<T = unknown>(cacheKey: string): Promise<T | null> {
  const entry = await findCacheByKey(cacheKey);
  if (!entry) return null;

  if (entry.expiresAt && entry.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  try {
    await incrementCacheHit(cacheKey);
  } catch {
    // Hit counter is best-effort telemetry; never fail the lookup because of it.
  }

  return (entry.resultJson ?? null) as T | null;
}

export interface StoreCacheInput {
  cacheKey: string;
  type: AiInteractionType;
  inputHash: string;
  resultText: string;
  resultJson: unknown;
  provider: AiProvider;
  model: string;
  promptVersion: string;
  ttlSeconds: number;
}

/**
 * Upserts a cache entry.
 *
 * - If `ttlSeconds > 0`, sets `expiresAt = now + ttlSeconds` so the Mongo TTL
 *   index can sweep the document automatically once it expires.
 * - If `ttlSeconds <= 0`, OMITS `expiresAt` entirely → permanent entry.
 *   This is a documented escape hatch; callers should set a positive TTL in
 *   normal operation.
 *
 * Returns void: the caller does not need the stored doc, and any error here
 * should be handled (or swallowed as warning) by the caller — the cache must
 * never break the user-facing flow.
 */
export async function storeCache(input: StoreCacheInput): Promise<void> {
  const data: Parameters<typeof upsertCacheEntry>[0] = {
    cacheKey: input.cacheKey,
    type: input.type,
    inputHash: input.inputHash,
    resultText: input.resultText,
    resultJson: input.resultJson,
    provider: input.provider,
    model: input.model,
    promptVersion: input.promptVersion,
  };

  if (input.ttlSeconds > 0) {
    data.expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
  }

  await upsertCacheEntry(data);
}
