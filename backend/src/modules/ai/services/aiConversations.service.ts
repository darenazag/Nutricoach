import {
  findConversationById,
  findMessagesByConversation,
} from '../repositories/aiConversation.repository.js';
import { AiServiceError } from './aiServiceError.js';

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

export async function getAiConversationById(
  conversationId: string,
): Promise<GetAiConversationResult> {
  if (!conversationId.trim()) {
    throw new AiServiceError('conversationId must not be empty.', 'validation_error');
  }

  const conv = await findConversationById(conversationId);
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
