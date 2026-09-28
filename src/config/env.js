import 'dotenv/config';
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LINE_CHANNEL_SECRET: z.string().min(1, 'LINE_CHANNEL_SECRET is required'),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1, 'LINE_CHANNEL_ACCESS_TOKEN is required'),
  MAX_MESSAGES_PER_GROUP: z.coerce.number().int().min(1).default(500),
  MAX_SUMMARY_MESSAGES: z.coerce.number().int().min(1).default(200),
  LLM_TIMEOUT_MS: z.coerce.number().int().min(1).default(30_000),
});

export function loadEnvironment(values = process.env) {
  const result = environmentSchema.safeParse(values);

  if (!result.success) {
    const messages = result.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  return result.data;
}
