import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from '../src/utils/clipboard';

describe('copyText', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('waits for a successful clipboard write', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(copyText('value')).resolves.toBeUndefined();
    expect(writeText).toHaveBeenCalledWith('value');
  });

  it('reports missing and rejected clipboard access', async () => {
    vi.stubGlobal('navigator', {});
    await expect(copyText('value')).rejects.toThrow('Clipboard access is unavailable');
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    await expect(copyText('value')).rejects.toThrow('denied');
  });
});
