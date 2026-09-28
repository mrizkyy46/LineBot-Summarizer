import { describe, expect, it } from 'vitest';
import { createMessageStore } from '../../src/services/message-store.service.js';

function message(index, groupId = 'Cgroup') {
  return { lineMessageId: `M${index}`, groupId, text: `message ${index}`, timestamp: index };
}

describe('message store', () => {
  it('keeps messages isolated by group and returns copies', () => {
    const store = createMessageStore();
    store.saveMessage(message(1));
    store.saveMessage(message(2, 'Cother'));

    const messages = store.getMessages('Cgroup');
    messages[0].text = 'changed';

    expect(store.getMessages('Cgroup')).toEqual([message(1)]);
    expect(store.getMessages('Cother')).toEqual([message(2, 'Cother')]);
  });

  it('removes oldest messages when the configured limit is exceeded', () => {
    const store = createMessageStore({ maxMessagesPerGroup: 2 });
    store.saveMessage(message(1));
    store.saveMessage(message(2));
    store.saveMessage(message(3));

    expect(store.getMessages('Cgroup')).toEqual([message(2), message(3)]);
    expect(store.getMessageCount('Cgroup')).toBe(2);
  });

  it('retrieves recent messages and clears stored data', () => {
    const store = createMessageStore();
    store.saveMessage(message(1));
    store.saveMessage(message(2));
    store.saveMessage(message(3));

    expect(store.getMessages('Cgroup', { limit: 2 })).toEqual([message(2), message(3)]);
    expect(store.clearGroup('Cgroup')).toBe(true);
    store.saveMessage(message(4));
    store.clearAll();
    expect(store.getMessageCount('Cgroup')).toBe(0);
  });
});
