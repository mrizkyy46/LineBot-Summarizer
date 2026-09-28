import { formatConversation } from './message-formatter.service.js';

export function createSummaryService({ llmService, timeZone = 'Asia/Jakarta' }) {
  return {
    async generateSummary(messages) {
      if (messages.length === 0) {
        return { status: 'empty' };
      }

      const summary = await llmService.generateSummary(formatConversation(messages, timeZone));
      return { status: 'generated', summary };
    },
  };
}
