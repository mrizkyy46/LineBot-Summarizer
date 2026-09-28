import { GoogleGenAI } from '@google/genai';

import { buildSummaryPrompt } from '../prompts/summary.prompt.js';

export class LlmServiceError extends Error {
  constructor(message, { cause } = {}) {
    super(message, { cause });
    this.name = 'LlmServiceError';
  }
}

function withTimeout(operation, timeoutMs) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new LlmServiceError('LLM request timed out')), timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]).finally(() => clearTimeout(timeout));
}

export function createGeminiLlmService({ apiKey, model, timeoutMs, client } = {}) {
  let geminiClient = client;

  function getClient() {
    geminiClient ??= new GoogleGenAI({ apiKey });
    return geminiClient;
  }

  return {
    async generateSummary(conversation) {
      try {
        const response = await withTimeout(
          getClient().models.generateContent({
            model,
            contents: buildSummaryPrompt(conversation),
          }),
          timeoutMs,
        );
        const summary = response.text?.trim();

        if (!summary) {
          throw new LlmServiceError('LLM returned an empty summary');
        }

        return summary;
      } catch (error) {
        if (error instanceof LlmServiceError) {
          throw error;
        }

        throw new LlmServiceError('LLM request failed', { cause: error });
      }
    },
  };
}
