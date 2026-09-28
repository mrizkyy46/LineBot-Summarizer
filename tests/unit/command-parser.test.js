import { describe, expect, it } from 'vitest';
import { parseCommand } from '../../src/commands/command-parser.js';

describe('command parser', () => {
  it('recognizes only the exact summary command', () => {
    expect(parseCommand('/summary')).toEqual({ name: 'summary' });
    expect(parseCommand('  /summary  ')).toEqual({ name: 'summary' });
  });

  it('leaves normal text and unsupported command forms alone', () => {
    expect(parseCommand('summary')).toBeNull();
    expect(parseCommand('/summary today')).toBeNull();
  });
});
