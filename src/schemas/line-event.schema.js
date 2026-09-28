import { z } from 'zod';

const sourceSchema = z.object({
  type: z.string(),
  groupId: z.string().optional(),
  userId: z.string().optional(),
});

export const lineEventSchema = z.object({
  type: z.string(),
  replyToken: z.string().optional(),
  timestamp: z.number().optional(),
  source: sourceSchema.optional(),
  message: z
    .object({
      id: z.string().optional(),
      type: z.string(),
      text: z.string().optional(),
    })
    .optional(),
});
