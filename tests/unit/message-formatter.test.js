import { describe, expect, it } from 'vitest';
import { formatConversation } from '../../src/services/message-formatter.service.js';

describe('conversation formatter', () => {
  it('formats messages as readable conversation text', () => {
    expect(
      formatConversation([
        { timestamp: new Date(2026, 8, 28, 14, 10).valueOf(), displayName: 'Andi', userId: 'U1', text: 'Besok deploy.' },
      ]),
    ).toBe('[2026-09-28 14:10] Andi:\nBesok deploy.');
  });
});
