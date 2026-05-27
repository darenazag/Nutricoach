import {
  findConversationByIdAndUser,
  findConversationsByUserPaginated,
  findMessagesByConversation,
} from '../repositories/aiConversation.repository.js';
import { AiServiceError } from './aiServiceError.js';

/** Hard ceiling on `limit`. Requests above this raise validation_error. */
export const AI_CONVERSATIONS_LIST_MAX_LIMIT = 50;
export const AI_CONVERSATIONS_LIST_DEFAULT_LIMIT = 10;
export const AI_CONVERSATIONS_LIST_DEFAULT_PAGE = 1;

// Mongoose timestamps option adds createdAt/updatedAt at runtime but they are
// not always reflected in InferSchemaType — we augment the lean doc type here.
type WithTimestamps<T> = T & { createdAt: Date; updatedAt: Date };

export interface ConversationDto {
  conversationId: string;
  userId: string;
  type: string;
  status: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageDto {
  messageId: string;
  conversationId: string;
  userId: string;
  role: string;
  content: string;
  structuredData: unknown;
  provider: string;
  model: string;
  promptVersion: string;
  safety: { blocked: boolean; reason: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface GetAiConversationResult {
  conversation: ConversationDto;
  messages: MessageDto[];
}

export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListAiConversationsResult {
  items: ConversationDto[];
  pagination: PaginationDto;
}

export async function getAiConversationById(
  conversationId: string,
  userId: string,
): Promise<GetAiConversationResult> {
  if (!conversationId.trim()) {
    throw new AiServiceError('conversationId must not be empty.', 'validation_error');
  }
  if (!userId.trim()) {
    throw new AiServiceError('userId must not be empty.', 'validation_error');
  }

  // Ownership is enforced at the repository level. A conversation that exists
  // but belongs to another user yields the SAME 'not_found' as a missing one
  // — this is intentional and avoids leaking which conversation IDs exist.
  const conv = await findConversationByIdAndUser(conversationId, userId);
  if (!conv) {
    throw new AiServiceError('AI conversation not found.', 'not_found');
  }

  const msgs = await findMessagesByConversation(conversationId);

  const c = conv as WithTimestamps<typeof conv>;

  const conversation: ConversationDto = {
    conversationId: c.conversationId,
    userId: c.userId,
    type: c.type as string,
    status: (c.status ?? 'active') as string,
    provider: (c.provider ?? 'gemini') as string,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };

  const messages: MessageDto[] = msgs.map((msg) => {
    const m = msg as WithTimestamps<typeof msg>;
    return {
      messageId: m.messageId,
      conversationId: m.conversationId,
      userId: m.userId,
      role: m.role as string,
      content: m.content ?? '',
      structuredData: (m.structuredData ?? null) as unknown,
      provider: (m.provider ?? 'gemini') as string,
      model: m.model ?? '',
      promptVersion: m.promptVersion ?? '',
      safety: {
        blocked: m.safety?.blocked ?? false,
        reason: m.safety?.reason ?? '',
      },
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  });

  return { conversation, messages };
}

/**
 * Paginated list of conversations owned by `userId`.
 *
 * Validation rules (all raise AiServiceError('validation_error')):
 *   - userId must be a non-blank string
 *   - page must be a finite integer >= 1
 *   - limit must be a finite integer between 1 and AI_CONVERSATIONS_LIST_MAX_LIMIT (50)
 *
 * Strategy on `limit > 50`: REJECT with validation_error rather than silently
 * clamp. A clamped response makes the client believe it received the full
 * window when in fact it only got 50 items; an explicit error forces the
 * caller to paginate properly.
 */
export async function listAiConversationsForUser(
  userId: string,
  options: { page: number; limit: number },
): Promise<ListAiConversationsResult> {
  if (typeof userId !== 'string' || !userId.trim()) {
    throw new AiServiceError('userId must not be empty.', 'validation_error');
  }
  const { page, limit } = options;
  if (!Number.isInteger(page) || page < 1) {
    throw new AiServiceError('page must be an integer >= 1.', 'validation_error', {
      details: { page },
    });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > AI_CONVERSATIONS_LIST_MAX_LIMIT) {
    throw new AiServiceError(
      `limit must be an integer between 1 and ${AI_CONVERSATIONS_LIST_MAX_LIMIT}.`,
      'validation_error',
      { details: { limit, max: AI_CONVERSATIONS_LIST_MAX_LIMIT } },
    );
  }

  const { items, total } = await findConversationsByUserPaginated(userId, { page, limit });

  const dtoItems: ConversationDto[] = items.map((conv) => {
    const c = conv as WithTimestamps<typeof conv>;
    return {
      conversationId: c.conversationId,
      userId: c.userId,
      type: c.type as string,
      status: (c.status ?? 'active') as string,
      provider: (c.provider ?? 'gemini') as string,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  });

  // totalPages = 0 when total = 0; ceil(total / limit) otherwise.
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    items: dtoItems,
    pagination: { page, limit, total, totalPages },
  };
}
