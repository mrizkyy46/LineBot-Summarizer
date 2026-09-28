function formatTimestamp(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

export function formatConversation(messages, timeZone = 'Asia/Jakarta') {
  return messages
    .map((message) => `[${formatTimestamp(message.timestamp, timeZone)}] ${message.displayName ?? message.userId}:\n${message.text}`)
    .join('\n\n');
}
