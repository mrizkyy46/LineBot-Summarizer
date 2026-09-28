const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RANGE_PATTERN = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/;

function isValidDate(date) {
  const match = DATE_PATTERN.exec(date);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
}

function isValidTime(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  return Boolean(match && Number(match[1]) < 24 && Number(match[2]) < 60);
}

export function parseCommand(text) {
  const input = text.trim();
  if (!input.startsWith('/')) return null;

  const [name, ...args] = input.slice(1).split(/\s+/);
  if (!['summary', 'status', 'clear', 'help'].includes(name)) {
    return { command: 'unknown', name };
  }

  if (name !== 'summary') {
    return args.length === 0 ? { command: name } : { command: 'invalid', name };
  }

  if (args.length === 0) return { command: 'summary', type: 'recent' };
  if (args.length === 1 && /^(1|3)h$/.test(args[0])) {
    return { command: 'summary', type: 'relative', value: Number(args[0][0]), unit: 'hour' };
  }
  if (args.length === 1 && ['today', 'yesterday'].includes(args[0])) {
    return { command: 'summary', type: args[0] };
  }
  if (args.length === 1 && DATE_PATTERN.test(args[0]) && isValidDate(args[0])) {
    return { command: 'summary', type: 'date', date: args[0] };
  }
  if (args.length === 2 && isValidDate(args[0])) {
    const times = TIME_RANGE_PATTERN.exec(args[1]);
    if (times) {
      const [, startHour, startMinute, endHour, endMinute] = times;
      const start = Number(startHour) * 60 + Number(startMinute);
      const end = Number(endHour) * 60 + Number(endMinute);
      if (isValidTime(`${startHour}:${startMinute}`) && isValidTime(`${endHour}:${endMinute}`) && start < end) {
        return { command: 'summary', type: 'range', date: args[0], startTime: `${startHour}:${startMinute}`, endTime: `${endHour}:${endMinute}` };
      }
    }
  }
  return { command: 'invalid', name: 'summary' };
}
