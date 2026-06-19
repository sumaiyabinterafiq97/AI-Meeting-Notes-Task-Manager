import { z } from 'zod';
import { MAX_CHAT_MESSAGE_LENGTH } from '../types/chat.types';

export const sendChatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(MAX_CHAT_MESSAGE_LENGTH, `Message must be at most ${MAX_CHAT_MESSAGE_LENGTH} characters`),
});

export type SendChatMessageFormData = z.infer<typeof sendChatMessageSchema>;
