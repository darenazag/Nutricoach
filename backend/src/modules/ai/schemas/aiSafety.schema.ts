import { z } from 'zod';

export const aiSafetySchema = z
  .object({
    isOutOfScope: z.boolean().default(false),
    flags: z.array(z.string()).default([]),
    escalationMessage: z.string().nullable().optional(),
  })
  .strict();

export type AiSafetyOutput = z.infer<typeof aiSafetySchema>;
