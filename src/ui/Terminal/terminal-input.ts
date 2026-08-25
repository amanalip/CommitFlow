export function normalizeTerminalInput(value: string): string {
  return value.replace(/\r\n|\r|\n/g, ' ');
}
