import LZString from 'lz-string';

const SHARE_VERSION = 1;

interface SharePayload {
  version: number;
  commands: string[];
}

export function encodeCommandHistoryToHash(commands: string[]): string {
  if (commands.length === 0) return '';
  const json = JSON.stringify({ version: SHARE_VERSION, commands } satisfies SharePayload);
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
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string');
    if (parsed?.version === SHARE_VERSION && Array.isArray(parsed.commands)) {
      return parsed.commands.filter((item: unknown): item is string => typeof item === 'string');
    }
    return [];
  } catch {
    return [];
  }
}
