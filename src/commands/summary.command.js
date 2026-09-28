import { dateAtTimezone, shiftDate, zonedDateTimeToUtc } from '../utils/timezone.js';

const EMPTY_MESSAGE = 'Tidak ada percakapan pada periode tersebut yang dapat dirangkum.';
const INVALID_MESSAGE = 'Format command tidak valid.\nContoh: /summary, /summary 1h, /summary today, /summary YYYY-MM-DD, /summary YYYY-MM-DD HH:mm-HH:mm';
const HELP_MESSAGE = `🤖 LINE Chat Summarizer\n\nAvailable commands:\n/summary — rangkum pesan terbaru\n/summary 1h — rangkum 1 jam terakhir\n/summary 3h — rangkum 3 jam terakhir\n/summary today — rangkum pesan hari ini\n/summary yesterday — rangkum pesan kemarin\n/summary YYYY-MM-DD — rangkum tanggal tertentu\n/summary YYYY-MM-DD HH:mm-HH:mm — rangkum rentang waktu\n/status — lihat status bot dan riwayat group\n/clear — hapus riwayat group ini\n/help — tampilkan bantuan`;

function rangeFor(command, now, timeZone) {
  if (command.type === 'relative') return { start: new Date(now.getTime() - command.value * 60 * 60 * 1000), end: now };
  const today = dateAtTimezone(now, timeZone);
  const date = command.type === 'today' ? today : command.type === 'yesterday' ? shiftDate(today, -1) : command.date;
  const startTime = command.type === 'range' ? command.startTime : '00:00';
  const endDate = command.type === 'range' ? date : shiftDate(date, 1);
  const endTime = command.type === 'range' ? command.endTime : '00:00';
  return { start: zonedDateTimeToUtc(date, startTime, timeZone), end: zonedDateTimeToUtc(endDate, endTime, timeZone) };
}

function formatStatus({ messageStore, groupId, maxMessagesPerGroup, timeZone }) {
  const messages = messageStore.getMessages(groupId);
  const formatDate = (timestamp) => new Intl.DateTimeFormat('id-ID', { timeZone, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(timestamp));
  const oldest = messages.reduce((result, message) => Math.min(result, message.timestamp), Infinity);
  const newest = messages.reduce((result, message) => Math.max(result, message.timestamp), -Infinity);
  return `🤖 Bot Status\n\nStatus: Online\nStored messages: ${messages.length}\nOldest stored message: ${messages.length ? formatDate(oldest) : '-'}\nNewest stored message: ${messages.length ? formatDate(newest) : '-'}\nMaximum messages: ${maxMessagesPerGroup}`;
}

export function createSummaryCommand({ summaryService, lineService, messageStore, logger, maxSummaryMessages = 200, maxMessagesPerGroup = 500, timeZone = 'Asia/Jakarta', now = () => new Date() }) {
  return {
    async execute({ command, groupId, replyToken }) {
      let response;
      if (command.command === 'invalid' || command.command === 'unknown') {
        response = command.command === 'unknown' ? `Command tidak dikenal: /${command.name}.\nGunakan /help untuk melihat command yang tersedia.` : INVALID_MESSAGE;
      } else if (command.command === 'help') {
        response = HELP_MESSAGE;
      } else if (command.command === 'status') {
        response = formatStatus({ messageStore, groupId, maxMessagesPerGroup, timeZone });
      } else if (command.command === 'clear') {
        messageStore.clearGroup(groupId);
        response = '🗑️ History chat untuk group ini telah dibersihkan.';
      } else {
        logger.info({ event: 'summary_requested', groupId, type: command.type });
        let messages;
        if (command.type === 'recent') messages = messageStore.getMessages(groupId, { limit: maxSummaryMessages });
        else {
          const { start, end } = rangeFor(command, now(), timeZone);
          messages = messageStore.getMessagesByTimeRange(groupId, start, end).slice(-maxSummaryMessages);
        }
        if (!messages.length) response = EMPTY_MESSAGE;
        else {
          try {
            const result = await summaryService.generateSummary(messages);
            response = result.status === 'empty' ? EMPTY_MESSAGE : result.summary;
            if (result.status === 'generated') logger.info({ event: 'summary_generated', groupId });
          } catch (error) {
            logger.error({ event: 'llm_request_failed', groupId, errorType: error.name });
            response = 'Maaf, summary sedang gagal dibuat. Silakan coba lagi beberapa saat.';
          }
        }
      }
      try {
        await lineService.replyText(replyToken, response);
      } catch (error) {
        logger.error({ event: 'line_reply_failed', groupId, error: error.message });
      }
    },
  };
}
