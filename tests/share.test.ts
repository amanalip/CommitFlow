import { describe, it, expect } from 'vitest';
import { encodeCommandHistoryToHash, decodeCommandHistoryFromHash } from '../src/share/url-codec';

describe('URL Hash Codec', () => {
  it('compresses and decompresses command sequences', () => {
    const commands = ['git init', 'git add .', 'git commit -m "initial commit"'];
    const hash = encodeCommandHistoryToHash(commands);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);

    const decoded = decodeCommandHistoryFromHash(hash);
    expect(decoded).toEqual(commands);
  });

  it('handles empty hash safely', () => {
    expect(decodeCommandHistoryFromHash('')).toEqual([]);
    expect(encodeCommandHistoryToHash([])).toBe('');
  });
});
