import { describe, it, expect } from 'vitest';
import { AiConversation } from '../../modules/ai/models/AiConversation.model.js';
import { AiMessage } from '../../modules/ai/models/AiMessage.model.js';
import { getAiConversationById } from '../../modules/ai/services/aiConversations.service.js';

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
