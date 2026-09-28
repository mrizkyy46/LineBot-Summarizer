export function parseCommand(text) {
  if (text.trim() === '/summary') {
    return { name: 'summary' };
  }

  return null;
}
