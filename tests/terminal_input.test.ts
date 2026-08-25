import { describe, expect, it } from 'vitest';
import { normalizeTerminalInput } from '../src/ui/Terminal/terminal-input';
import { parseCommand } from '../src/parser/command-parser';

describe('terminal paste input', () => {
  it('inserts multi-character text without changing quotes', () => {
    const pasted = normalizeTerminalInput('git commit -m "fix quoted message"');
    expect(pasted).toBe('git commit -m "fix quoted message"');
    const parsed = parseCommand(pasted);
    expect(parsed.type).toBe('commit');
    expect(parsed.flags.m).toBe('fix quoted message');
  });

  it('normalizes multiline paste into one non-executing command line', () => {
    expect(normalizeTerminalInput('git status\ngit log --oneline\r\ngit branch')).toBe(
      'git status git log --oneline git branch',
    );
  });
});
