import { LineBotClient } from '@line/bot-sdk';

const MAX_LINE_TEXT_LENGTH = 5_000;

function splitText(text) {
  const parts = [];
  let remaining = text;

  while (remaining.length > MAX_LINE_TEXT_LENGTH) {
    const splitAt = remaining.lastIndexOf('\n', MAX_LINE_TEXT_LENGTH);
    const end = splitAt > 0 ? splitAt : MAX_LINE_TEXT_LENGTH;
    parts.push(remaining.slice(0, end));
    remaining = remaining.slice(end).replace(/^\n/, '');
  }

  return [...parts, remaining];
}

export function createLineService({ channelAccessToken, client } = {}) {
  if (!client && !channelAccessToken) {
    return {
      async replyText() {
        throw new Error('LINE client is not configured');
      },
    };
  }

  const lineClient = client ?? LineBotClient.fromChannelAccessToken({ channelAccessToken });

  return {
    replyText(replyToken, text) {
      return lineClient.replyMessage({
        replyToken,
        messages: splitText(text).map((part) => ({ type: 'text', text: part })),
      });
    },
    async getGroupMemberDisplayName(groupId, userId) {
      const profile = await lineClient.getGroupMemberProfile(groupId, userId);
      return profile.displayName;
    },
  };
}
