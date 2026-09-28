import { buildSummaryInstructions } from '../prompts/summary.prompt.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503]);
const MAX_ATTEMPTS = 4;
// Leaves generous room below GPT-OSS 20B's 131,072-token context for system
// instructions, message framing, tokenization variance, and generated output.
const MAX_CONVERSATION_CHARACTERS = 30_000;

export class LlmServiceError extends Error {
  constructor(message, { cause, status, type = 'provider_error' } = {}) {
    super(message, { cause });
    this.name = 'LlmServiceError';
    this.status = status;
    this.type = type;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusError(status) {
  const errors = {
    400: ['invalid_request', 'Groq rejected the request'],
    401: ['authentication_error', 'Groq authentication failed'],
    403: ['permission_error', 'Groq access was denied'],
    404: ['not_found', 'Groq model or endpoint was not found'],
    429: ['rate_limit', 'Groq rate limit was reached'],
    500: ['provider_error', 'Groq service error'],
    502: ['provider_error', 'Groq service unavailable'],
    503: ['provider_error', 'Groq service unavailable'],
  };
  const [type, message] = errors[status] ?? ['http_error', 'Groq request failed'];
  return new LlmServiceError(message, { status, type });
}

export function createGroqLlmService({ apiKey, model, timeoutMs = 30_000, logger = { info() {}, warn() {}, error() {} }, fetchImpl = fetch, sleep = delay } = {}) {
  return {
    async generateSummary(conversation) {
      const boundedConversation = conversation.slice(-MAX_CONVERSATION_CHARACTERS);
      const instructions = buildSummaryInstructions();

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        let response;
        try {
          logger.info({ event: 'llm_request', provider: 'groq', model, messageCount: boundedConversation.split('\n\n').length, attempt });
          response = await fetchImpl(GROQ_API_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: instructions },
                { role: 'user', content: boundedConversation },
              ],
              temperature: 0.2,
            }),
            signal: controller.signal,
          });
        } catch (cause) {
          clearTimeout(timeout);
          const timedOut = cause?.name === 'AbortError';
          const error = new LlmServiceError(timedOut ? 'LLM request timed out' : 'LLM network request failed', {
            cause,
            type: timedOut ? 'timeout' : 'network_error',
          });
          logger.error({ event: 'llm_request_failed', provider: 'groq', model, attempt, errorType: error.type, errorMessage: error.message });
          throw error;
        }
        clearTimeout(timeout);

        if (!response.ok) {
          const error = statusError(response.status);
          logger.warn({ event: 'llm_response_error', provider: 'groq', model, attempt, responseStatus: response.status, errorType: error.type, errorMessage: error.message });
          if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
            logger.info({ event: 'llm_retry', provider: 'groq', model, attempt, nextAttempt: attempt + 1, delayMs: 1000 * (2 ** (attempt - 1)), responseStatus: response.status });
            await sleep(1000 * (2 ** (attempt - 1)));
            continue;
          }
          throw error;
        }

        let data;
        try {
          data = await response.json();
        } catch (cause) {
          const error = new LlmServiceError('Groq returned a malformed response', { cause, status: response.status, type: 'malformed_response' });
          logger.error({ event: 'llm_request_failed', provider: 'groq', model, attempt, responseStatus: response.status, errorType: error.type, errorMessage: error.message });
          throw error;
        }
        const summary = data?.choices?.[0]?.message?.content?.trim();
        if (typeof summary !== 'string' || !summary) {
          const error = new LlmServiceError('Groq returned an empty or malformed summary', { status: response.status, type: 'malformed_response' });
          logger.error({ event: 'llm_request_failed', provider: 'groq', model, attempt, responseStatus: response.status, errorType: error.type, errorMessage: error.message });
          throw error;
        }
        logger.info({ event: 'llm_response_received', provider: 'groq', model, attempt, responseStatus: response.status });
        return summary;
      }
      throw new LlmServiceError('Groq request failed after retries');
    },
  };
}

export function createLlmService(config = {}) {
  if (config.provider && config.provider !== 'groq') {
    throw new LlmServiceError('Unsupported LLM provider', { type: 'configuration_error' });
  }
  return createGroqLlmService(config);
}
