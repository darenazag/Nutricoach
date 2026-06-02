import { describe, it, expect } from 'vitest';
import { AiConversation } from '../../modules/ai/models/AiConversation.model.js';
import { AiMessage } from '../../modules/ai/models/AiMessage.model.js';
import {
  AI_CONVERSATIONS_LIST_MAX_LIMIT,
  getAiConversationById,
  listAiConversationsForUser,
} from '../../modules/ai/services/aiConversations.service.js';

describe('getAiConversationById', () => {
  it('returns conversation and messages sorted chronologically (owner request)', async () => {
    await AiConversation.create({
      conversationId: 'conv-001',
      userId: 'user-001',
      type: 'chat',
    });
    await AiMessage.create({
      messageId: 'msg-001',
      conversationId: 'conv-001',
      userId: 'user-001',
      role: 'user',
      content: 'Hola',
    });
    await AiMessage.create({
      messageId: 'msg-002',
      conversationId: 'conv-001',
      userId: 'user-001',
      role: 'assistant',
      content: 'Hola, ¿en qué puedo ayudarte?',
    });

    const result = await getAiConversationById('conv-001', 'user-001');

    expect(result.conversation.conversationId).toBe('conv-001');
    expect(result.conversation.userId).toBe('user-001');
    expect(result.conversation.type).toBe('chat');
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]?.role).toBe('user');
    expect(result.messages[1]?.role).toBe('assistant');
  });

  it('returns empty messages array when conversation has no messages', async () => {
    await AiConversation.create({
      conversationId: 'conv-002',
      userId: 'user-002',
      type: 'menu_generation',
    });

    const result = await getAiConversationById('conv-002', 'user-002');
    expect(result.messages).toHaveLength(0);
  });

  it('does not expose _id or __v on conversation DTO', async () => {
    await AiConversation.create({
      conversationId: 'conv-003',
      userId: 'user-003',
      type: 'chat',
    });

    const result = await getAiConversationById('conv-003', 'user-003');
    expect(result.conversation).not.toHaveProperty('_id');
    expect(result.conversation).not.toHaveProperty('__v');
  });

  it('does not expose _id or __v on message DTOs', async () => {
    await AiConversation.create({
      conversationId: 'conv-004',
      userId: 'user-004',
      type: 'chat',
    });
    await AiMessage.create({
      messageId: 'msg-004',
      conversationId: 'conv-004',
      userId: 'user-004',
      role: 'user',
      content: 'Prueba',
    });

    const result = await getAiConversationById('conv-004', 'user-004');
    expect(result.messages[0]).not.toHaveProperty('_id');
    expect(result.messages[0]).not.toHaveProperty('__v');
  });

  it('throws AiServiceError with code not_found when conversation does not exist', async () => {
    await expect(getAiConversationById('nonexistent-id', 'user-001')).rejects.toMatchObject({
      name: 'AiServiceError',
      code: 'not_found',
    });
  });

  it('throws AiServiceError with code validation_error when conversationId is blank', async () => {
    await expect(getAiConversationById('   ', 'user-001')).rejects.toMatchObject({
      name: 'AiServiceError',
      code: 'validation_error',
    });
  });

  it('throws AiServiceError with code validation_error when userId is blank', async () => {
    await expect(getAiConversationById('conv-001', '   ')).rejects.toMatchObject({
      name: 'AiServiceError',
      code: 'validation_error',
    });
  });

  // ── Ownership ────────────────────────────────────────────────────────────

  it('returns the conversation when userId matches the owner', async () => {
    await AiConversation.create({
      conversationId: 'conv-own-ok',
      userId: 'owner-1',
      type: 'chat',
    });

    const result = await getAiConversationById('conv-own-ok', 'owner-1');
    expect(result.conversation.userId).toBe('owner-1');
  });

  it('throws not_found when the conversation exists but belongs to another user', async () => {
    // Owned by the victim.
    await AiConversation.create({
      conversationId: 'conv-private',
      userId: 'victim-1',
      type: 'chat',
    });
    await AiMessage.create({
      messageId: 'msg-private',
      conversationId: 'conv-private',
      userId: 'victim-1',
      role: 'user',
      content: 'secreto',
    });

    // Attacker (different userId) requests the same conversationId.
    // The service must NOT distinguish "exists but not yours" from "missing":
    // both surface as not_found to avoid leaking existence.
    await expect(getAiConversationById('conv-private', 'attacker-1')).rejects.toMatchObject({
      name: 'AiServiceError',
      code: 'not_found',
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Paginated list
// ────────────────────────────────────────────────────────────────────────────

describe('listAiConversationsForUser', () => {
  async function seedConversations(userId: string, ids: string[]): Promise<void> {
    // Sequential creation guarantees distinct timestamps so sort order is stable.
    for (const id of ids) {
      await AiConversation.create({
        conversationId: id,
        userId,
        type: 'chat',
      });
      // Small delay to differentiate updatedAt between docs (mongoose default
      // resolution is ms — a tick is enough in practice).
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  it('returns only conversations owned by the authenticated user', async () => {
    await seedConversations('owner', ['o-1', 'o-2']);
    await seedConversations('intruder', ['x-1', 'x-2']);

    const result = await listAiConversationsForUser('owner', { page: 1, limit: 10 });
    expect(result.items).toHaveLength(2);
    for (const item of result.items) {
      expect(item.userId).toBe('owner');
    }
    const ids = result.items.map((i) => i.conversationId).sort();
    expect(ids).toEqual(['o-1', 'o-2']);
  });

  it('does not include conversations from other users in totals', async () => {
    await seedConversations('alice', ['a-1', 'a-2', 'a-3']);
    await seedConversations('bob', ['b-1']);

    const result = await listAiConversationsForUser('alice', { page: 1, limit: 10 });
    expect(result.pagination.total).toBe(3);
    expect(result.items.every((i) => i.userId === 'alice')).toBe(true);
  });

  it('paginates correctly: page=1 limit=2 returns 2 items, page=2 returns the rest', async () => {
    await seedConversations('paginator', ['p-1', 'p-2', 'p-3', 'p-4', 'p-5']);

    const page1 = await listAiConversationsForUser('paginator', { page: 1, limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.pagination).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });

    const page2 = await listAiConversationsForUser('paginator', { page: 2, limit: 2 });
    expect(page2.items).toHaveLength(2);
    expect(page2.pagination).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });

    const page3 = await listAiConversationsForUser('paginator', { page: 3, limit: 2 });
    expect(page3.items).toHaveLength(1);

    // No overlap between pages.
    const allIds = [...page1.items, ...page2.items, ...page3.items].map((i) => i.conversationId);
    expect(new Set(allIds).size).toBe(5);
  });

  it('orders items by updatedAt desc (most recent first)', async () => {
    await seedConversations('orderly', ['old-1', 'mid-2', 'new-3']);

    const result = await listAiConversationsForUser('orderly', { page: 1, limit: 10 });
    expect(result.items.map((i) => i.conversationId)).toEqual(['new-3', 'mid-2', 'old-1']);
  });

  it('returns empty items + total=0 + totalPages=0 when the user has no conversations', async () => {
    const result = await listAiConversationsForUser('ghost', { page: 1, limit: 10 });
    expect(result.items).toEqual([]);
    expect(result.pagination).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
  });

  it('throws validation_error when userId is blank', async () => {
    await expect(
      listAiConversationsForUser('   ', { page: 1, limit: 10 }),
    ).rejects.toMatchObject({ name: 'AiServiceError', code: 'validation_error' });
  });

  it('throws validation_error when page < 1', async () => {
    await expect(
      listAiConversationsForUser('owner', { page: 0, limit: 10 }),
    ).rejects.toMatchObject({ name: 'AiServiceError', code: 'validation_error' });
  });

  it('throws validation_error when page is not an integer', async () => {
    await expect(
      listAiConversationsForUser('owner', { page: 1.5, limit: 10 }),
    ).rejects.toMatchObject({ name: 'AiServiceError', code: 'validation_error' });

    await expect(
      listAiConversationsForUser('owner', { page: Number.NaN, limit: 10 }),
    ).rejects.toMatchObject({ name: 'AiServiceError', code: 'validation_error' });
  });

  it('throws validation_error when limit < 1', async () => {
    await expect(
      listAiConversationsForUser('owner', { page: 1, limit: 0 }),
    ).rejects.toMatchObject({ name: 'AiServiceError', code: 'validation_error' });
  });

  it(`throws validation_error when limit > ${AI_CONVERSATIONS_LIST_MAX_LIMIT} (no silent clamping)`, async () => {
    await expect(
      listAiConversationsForUser('owner', {
        page: 1,
        limit: AI_CONVERSATIONS_LIST_MAX_LIMIT + 1,
      }),
    ).rejects.toMatchObject({ name: 'AiServiceError', code: 'validation_error' });
  });
});
