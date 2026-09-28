import { formatConversation } from './message-formatter.service.js';

export function createSummaryService({ messageStore, llmService, maxSummaryMessages = 200 }) {
  return {
    async generateSummary(groupId) {
      const messages = messageStore.getMessages(groupId, { limit: maxSummaryMessages });

      if (messages.length === 0) {
        return { status: 'empty' };
      }

      const summary = await llmService.generateSummary(formatConversation(messages));
      return { status: 'generated', summary };
    },
  };
}
