import { describe, expect, it } from 'vitest';
import { parseCommand } from '../../src/commands/command-parser.js';

describe('command parser', () => {
  it.each([
    ['/summary', { command: 'summary', type: 'recent' }],
    ['/summary 1h', { command: 'summary', type: 'relative', value: 1, unit: 'hour' }],
    ['/summary 3h', { command: 'summary', type: 'relative', value: 3, unit: 'hour' }],
    ['/summary today', { command: 'summary', type: 'today' }],
    ['/summary yesterday', { command: 'summary', type: 'yesterday' }],
    ['/summary 2026-09-28', { command: 'summary', type: 'date', date: '2026-09-28' }],
    ['/summary 2026-09-28 14:00-18:00', { command: 'summary', type: 'range', date: '2026-09-28', startTime: '14:00', endTime: '18:00' }],
    ['/status', { command: 'status' }], ['/clear', { command: 'clear' }], ['/help', { command: 'help' }],
  ])('parses %s', (input, expected) => expect(parseCommand(input)).toEqual(expected));

  it.each(['/summary abc', '/summary 2026-02-30', '/summary 2026-09-28 25:00-26:00', '/summary 2026-09-28 18:00-14:00', '/help now'])('rejects invalid input %s', (input) => {
    expect(parseCommand(input)).toMatchObject({ command: 'invalid' });
  });

  it('distinguishes ordinary text and unknown commands', () => {
    expect(parseCommand('hello')).toBeNull();
    expect(parseCommand('/something')).toEqual({ command: 'unknown', name: 'something' });
  });
});
