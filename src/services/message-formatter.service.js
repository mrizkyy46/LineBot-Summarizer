function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatConversation(messages) {
  return messages
    .map((message) => `[${formatTimestamp(message.timestamp)}] ${message.displayName ?? message.userId}:\n${message.text}`)
    .join('\n\n');
}
