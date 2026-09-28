import 'dotenv/config';
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LINE_CHANNEL_SECRET: z.string().min(1, 'LINE_CHANNEL_SECRET is required'),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1, 'LINE_CHANNEL_ACCESS_TOKEN is required'),
  LLM_PROVIDER: z.literal('groq', 'LLM_PROVIDER must be groq').default('groq'),
  LLM_API_KEY: z.string().min(1, 'LLM_API_KEY is required'),
  LLM_MODEL: z.string().min(1, 'LLM_MODEL is required').default('openai/gpt-oss-20b'),
  MAX_MESSAGES_PER_GROUP: z.coerce.number().int().min(1).default(500),
  MAX_SUMMARY_MESSAGES: z.coerce.number().int().min(1).default(200),
  LLM_TIMEOUT_MS: z.coerce.number().int().min(1).default(30_000),
  APP_TIMEZONE: z.string().min(1).default('Asia/Jakarta'),
});

export function loadEnvironment(values = process.env) {
  const result = environmentSchema.safeParse(values);

  if (!result.success) {
    const messages = result.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  return result.data;
}
