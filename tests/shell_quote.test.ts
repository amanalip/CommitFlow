import { describe, expect, it } from 'vitest';
import { quoteShellArg } from '../src/parser/shell-quote';
import { parseCommand } from '../src/parser/command-parser';

describe('Shell argument quoting', () => {
  it('leaves safe paths readable', () => {
    expect(quoteShellArg('src/app.ts')).toBe('src/app.ts');
  });

  it('preserves spaces and apostrophes through the command parser', () => {
    const path = "docs/user's guide.md";
    const parsed = parseCommand(`git add ${quoteShellArg(path)}`);
    expect(parsed.args).toEqual([path]);
  });
});
