/**
 * Architectural guarantee: every AI controller must take `userId` from the
 * authenticated JWT (`req.auth.sub`) and IGNORE any value the client might
 * send in `body.userId`. AI Lab still sends one, that is fine — the backend
 * just overrides it.
 *
 * Each test below feeds `body.userId = 'hacker'` and asserts the underlying
 * service was called with the JWT-derived id, NEVER 'hacker'.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../modules/ai/services/index.js', () => ({
  runAiChat: vi.fn(),
  runAiMenu: vi.fn(),
  runAiProfileExplanation: vi.fn(),
  createWeeklyMenuPlan: vi.fn(),
  getWeeklyMenuPlanById: vi.fn(),
  getAiConversationById: vi.fn(),
  listAiConversationsForUser: vi.fn(),
  // Constants the controller imports from the barrel.
  AI_CONVERSATIONS_LIST_DEFAULT_PAGE: 1,
  AI_CONVERSATIONS_LIST_DEFAULT_LIMIT: 10,
}));

vi.mock('../../modules/ai/services/aiPlateAnalysis.service.js', () => ({
  runAiPlateAnalysis: vi.fn(),
}));

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 100, height: 100 }),
    resize: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue({
      data: Buffer.from('processed'),
      info: { width: 100, height: 100 },
    }),
  })),
}));

import {
  runAiChat,
  runAiMenu,
  runAiProfileExplanation,
  createWeeklyMenuPlan,
  getAiConversationById,
  listAiConversationsForUser,
} from '../../modules/ai/services/index.js';
import { runAiPlateAnalysis } from '../../modules/ai/services/aiPlateAnalysis.service.js';

import { postAiChat } from '../../modules/ai/controllers/aiChat.controller.js';
import { postAiMenu } from '../../modules/ai/controllers/aiMenu.controller.js';
import { postAiProfileExplanation } from '../../modules/ai/controllers/aiProfileExplanation.controller.js';
import { postAiWeeklyMenu } from '../../modules/ai/controllers/aiWeeklyMenu.controller.js';
import { handlePlateAnalysis } from '../../modules/ai/controllers/aiPlateAnalysis.controller.js';
import {
  getAiConversation,
  listAiConversations,
} from '../../modules/ai/controllers/aiConversations.controller.js';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeReq(
  body: Record<string, unknown> = {},
  sub = 123,
  params: Record<string, string> = {},
  query: Record<string, string> = {},
): Request {
  return {
    body,
    params,
    query,
    auth: { sub, email: 'demo@nutricoach.com', role: 'user' },
  } as unknown as Request;
}

function makeReqWithImage(body: Record<string, unknown> = {}, sub = 123): Request {
  return {
    body,
    params: {},
    auth: { sub, email: 'demo@nutricoach.com', role: 'user' },
    file: {
      fieldname: 'image',
      originalname: 'food.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
      size: 1024,
    },
  } as unknown as Request;
}

function makeRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

const HACKER_BODY = { userId: 'hacker', message: 'hi' };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AI controllers anchor userId to req.auth.sub (never trust body.userId)', () => {
  const next = vi.fn() as unknown as NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runAiChat).mockResolvedValue({} as never);
    vi.mocked(runAiMenu).mockResolvedValue({} as never);
    vi.mocked(runAiProfileExplanation).mockResolvedValue({} as never);
    vi.mocked(createWeeklyMenuPlan).mockResolvedValue({} as never);
    vi.mocked(listAiConversationsForUser).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    } as never);
    vi.mocked(getAiConversationById).mockResolvedValue({
      conversation: {
        conversationId: 'conv-x',
        userId: '123',
        type: 'chat',
        status: 'active',
        provider: 'gemini',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      messages: [],
    } as never);
    vi.mocked(runAiPlateAnalysis).mockResolvedValue({
      structuredData: {
        detectedFoods: [],
        estimatedNutrition: {
          caloriesRange: { min: 0, max: 0 },
          proteinRange: { min: 0, max: 0 },
          carbsRange: { min: 0, max: 0 },
          fatRange: { min: 0, max: 0 },
        },
        assumptions: [],
        confidenceReason: '',
        proportions: { protein: '', carbs: '', vegetables: '', fats: '' },
        recommendations: [],
        warnings: [],
        confidence: 'low',
      },
    } as never);
  });

  it('postAiChat: body.userId="hacker" → service receives userId="123"', async () => {
    await postAiChat(makeReq(HACKER_BODY), makeRes(), next);
    expect(runAiChat).toHaveBeenCalledTimes(1);
    expect(runAiChat).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '123', message: 'hi' }),
    );
    const call = vi.mocked(runAiChat).mock.calls[0]![0] as { userId: string };
    expect(call.userId).not.toBe('hacker');
  });

  it('postAiMenu: body.userId="hacker" → service receives userId="123"', async () => {
    await postAiMenu(makeReq({ userId: 'hacker', objective: 'lose_weight' }), makeRes(), next);
    expect(runAiMenu).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '123', objective: 'lose_weight' }),
    );
  });

  it('postAiProfileExplanation: body.userId="hacker" → service receives userId="123"', async () => {
    await postAiProfileExplanation(
      makeReq({ userId: 'hacker', basalMetabolicRate: 1600 }),
      makeRes(),
      next,
    );
    expect(runAiProfileExplanation).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '123', basalMetabolicRate: 1600 }),
    );
  });

  it('postAiWeeklyMenu: body.userId="hacker" → service receives userId="123"', async () => {
    await postAiWeeklyMenu(makeReq({ userId: 'hacker', days: 7 }), makeRes(), next);
    expect(createWeeklyMenuPlan).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '123', days: 7 }),
    );
  });

  it('postAiPlateAnalysis: body.userId="hacker" → service receives userId="123"', async () => {
    // handlePlateAnalysis = [uploadMiddleware, postAiPlateAnalysis]; we invoke
    // the second handler directly because the request already carries req.file.
    const handler = handlePlateAnalysis[1] as NonNullable<typeof handlePlateAnalysis[1]>;
    await handler(makeReqWithImage({ userId: 'hacker' }), makeRes(), next);
    expect(runAiPlateAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '123' }),
    );
    const call = vi.mocked(runAiPlateAnalysis).mock.calls[0]![0] as { userId: string };
    expect(call.userId).not.toBe('hacker');
  });

  it('listAiConversations: uses req.auth.sub as userId, ignores query.userId', async () => {
    await listAiConversations(
      makeReq({}, 123, {}, { userId: 'hacker', page: '2', limit: '5' }),
      makeRes(),
      next,
    );
    expect(listAiConversationsForUser).toHaveBeenCalledWith('123', { page: 2, limit: 5 });
  });

  it('listAiConversations: defaults page=1 limit=10 when query missing', async () => {
    await listAiConversations(makeReq({}, 123), makeRes(), next);
    expect(listAiConversationsForUser).toHaveBeenCalledWith('123', { page: 1, limit: 10 });
  });

  it('listAiConversations: different JWT subjects produce different ownership scopes', async () => {
    await listAiConversations(makeReq({}, 7), makeRes(), next);
    expect(listAiConversationsForUser).toHaveBeenLastCalledWith('7', { page: 1, limit: 10 });

    await listAiConversations(makeReq({}, 42), makeRes(), next);
    expect(listAiConversationsForUser).toHaveBeenLastCalledWith('42', { page: 1, limit: 10 });
  });

  it('getAiConversation: passes req.auth.sub as userId to the service (ownership scope)', async () => {
    await getAiConversation(
      makeReq({}, 123, { conversationId: 'conv-x' }),
      makeRes(),
      next,
    );
    expect(getAiConversationById).toHaveBeenCalledWith('conv-x', '123');
  });

  it('getAiConversation: different JWT subjects target their own ownership scope', async () => {
    await getAiConversation(
      makeReq({}, 7, { conversationId: 'conv-y' }),
      makeRes(),
      next,
    );
    expect(getAiConversationById).toHaveBeenLastCalledWith('conv-y', '7');

    await getAiConversation(
      makeReq({}, 42, { conversationId: 'conv-y' }),
      makeRes(),
      next,
    );
    expect(getAiConversationById).toHaveBeenLastCalledWith('conv-y', '42');
  });

  it('different JWT subjects produce different userIds (sub 7 → "7", sub 42 → "42")', async () => {
    await postAiChat(makeReq({ message: 'x' }, 7), makeRes(), next);
    expect(runAiChat).toHaveBeenLastCalledWith(expect.objectContaining({ userId: '7' }));

    await postAiChat(makeReq({ message: 'x' }, 42), makeRes(), next);
    expect(runAiChat).toHaveBeenLastCalledWith(expect.objectContaining({ userId: '42' }));
  });
});
