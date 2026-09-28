const EMPTY_CONVERSATION_MESSAGE = 'Belum ada cukup percakapan untuk dirangkum.';
const SUMMARY_FAILED_MESSAGE = 'Maaf, summary sedang gagal dibuat. Silakan coba lagi beberapa saat.';

export function createSummaryCommand({ summaryService, lineService, logger }) {
  return {
    async execute({ groupId, replyToken }) {
      logger.info({ event: 'summary_requested', groupId });

      try {
        const result = await summaryService.generateSummary(groupId);
        const text = result.status === 'empty' ? EMPTY_CONVERSATION_MESSAGE : result.summary;
        await lineService.replyText(replyToken, text);

        if (result.status === 'generated') {
          logger.info({ event: 'summary_generated', groupId });
        }
      } catch (error) {
        logger.error({ event: 'llm_request_failed', groupId, errorType: error.name });

        try {
          await lineService.replyText(replyToken, SUMMARY_FAILED_MESSAGE);
        } catch (replyError) {
          logger.error({ event: 'line_reply_failed', groupId, error: replyError.message });
        }
      }
    },
  };
}
