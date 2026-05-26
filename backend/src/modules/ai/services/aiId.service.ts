import { randomUUID } from 'node:crypto';

const CONVERSATION_ID_PREFIX = 'conv_';
const MESSAGE_ID_PREFIX = 'msg_';

export function generateConversationId(): string {
  return `${CONVERSATION_ID_PREFIX}${randomUUID()}`;
}

export function generateMessageId(): string {
  return `${MESSAGE_ID_PREFIX}${randomUUID()}`;
}
