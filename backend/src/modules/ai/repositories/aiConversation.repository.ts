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

/**
 * Owner-scoped paginated list of a user's conversations.
 *
 * Sort: most-recent first by `updatedAt`, with `createdAt` as a stable
 * tiebreaker (Mongoose `timestamps: true` guarantees both fields exist).
 *
 * Returns both the page items and the total count in a single round trip,
 * so the service can compute totalPages without a second query path.
 */
export async function findConversationsByUserPaginated(
  userId: string,
  options: { page: number; limit: number },
): Promise<{ items: AiConversationDocument[]; total: number }> {
  const { page, limit } = options;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    AiConversation.find({ userId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<AiConversationDocument[]>()
      .exec(),
    AiConversation.countDocuments({ userId }).exec(),
  ]);

  return { items, total };
}
