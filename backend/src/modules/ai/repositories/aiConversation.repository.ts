import {
  AiConversation,
  AiMessage,
  type AiConversationDocument,
  type AiMessageDocument,
} from '../models/index.js';

export async function createConversation(
  data: Partial<AiConversationDocument>,
): Promise<AiConversationDocument> {
  const created = await AiConversation.create(data);
  return created.toObject() as AiConversationDocument;
}

export async function addMessage(
  data: Partial<AiMessageDocument>,
): Promise<AiMessageDocument> {
  const created = await AiMessage.create(data);
  return created.toObject() as AiMessageDocument;
}

export async function findConversationById(
  conversationId: string,
): Promise<AiConversationDocument | null> {
  return AiConversation.findOne({ conversationId }).lean<AiConversationDocument | null>().exec();
}

/**
 * Owner-scoped lookup: returns the conversation ONLY if it both exists and
 * belongs to `userId`. Callers use this to enforce ownership without leaking
 * the existence of other users' conversations (the service maps a miss to
 * 'not_found' regardless of why).
 */
export async function findConversationByIdAndUser(
  conversationId: string,
  userId: string,
): Promise<AiConversationDocument | null> {
  return AiConversation.findOne({ conversationId, userId })
    .lean<AiConversationDocument | null>()
    .exec();
}

export async function findMessagesByConversation(
  conversationId: string,
): Promise<AiMessageDocument[]> {
  return AiMessage.find({ conversationId })
    .sort({ createdAt: 1 })
    .lean<AiMessageDocument[]>()
    .exec();
}
