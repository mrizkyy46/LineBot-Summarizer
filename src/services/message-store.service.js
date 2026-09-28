export function createMessageStore({ maxMessagesPerGroup = 500 } = {}) {
  const messagesByGroup = new Map();

  function saveMessage(message) {
    const messages = messagesByGroup.get(message.groupId) ?? [];
    messages.push({ ...message });

    if (messages.length > maxMessagesPerGroup) {
      messages.splice(0, messages.length - maxMessagesPerGroup);
    }

    messagesByGroup.set(message.groupId, messages);
  }

  function getMessages(groupId, { limit } = {}) {
    const messages = messagesByGroup.get(groupId) ?? [];
    const recentMessages = limit === undefined ? messages : messages.slice(-limit);
    return recentMessages.map((message) => ({ ...message }));
  }

  return {
    saveMessage,
    getMessages,
    getMessageCount: (groupId) => (messagesByGroup.get(groupId) ?? []).length,
    clearGroup: (groupId) => messagesByGroup.delete(groupId),
    clearAll: () => messagesByGroup.clear(),
  };
}
