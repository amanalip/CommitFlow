export async function copyText(text: string): Promise<void> {
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard?.writeText) {
    throw new Error('Clipboard access is unavailable in this browser.');
  }
  await clipboard.writeText(text);
}
