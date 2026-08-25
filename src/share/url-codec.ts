import LZString from 'lz-string';

export function encodeCommandHistoryToHash(commands: string[]): string {
  if (commands.length === 0) return '';
  const json = JSON.stringify(commands);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeCommandHistoryFromHash(hash: string): string[] {
  if (!hash) return [];
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!cleanHash) return [];

  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(cleanHash);
    if (!decompressed) return [];
    const parsed = JSON.parse(decompressed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
