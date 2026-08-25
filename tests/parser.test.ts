import { describe, it, expect } from 'vitest';
import { parseCommand, tokenizeCommandLine } from '../src/parser/command-parser';
import { findClosestGitCommand, getAutocompleteCandidates } from '../src/parser/suggestions';

describe('Command Tokenizer', () => {
  it('tokenizes simple commands', () => {
    const tokens = tokenizeCommandLine('git commit -m "initial commit"');
    expect(tokens).toEqual(['git', 'commit', '-m', 'initial commit']);
  });

  it('handles single and double quotes and escaped spaces', () => {
    const tokens = tokenizeCommandLine("git commit -m 'feat: first version' --author=\"John Doe\"");
    expect(tokens).toEqual(['git', 'commit', '-m', 'feat: first version', '--author=John Doe']);
  });
});

describe('Command Parser', () => {
  it('parses git init with branch flag', () => {
    const parsed = parseCommand('git init -b main');
    expect(parsed.type).toBe('init');
    expect(parsed.flags['b']).toBe('main');
  });

  it('parses git add files and wildcards', () => {
    const parsed = parseCommand('git add index.js style.css');
    expect(parsed.type).toBe('add');
    expect(parsed.args).toEqual(['index.js', 'style.css']);
  });

  it('parses git checkout -b feature', () => {
    const parsed = parseCommand('git checkout -b feature/login');
    expect(parsed.type).toBe('checkout');
    expect(parsed.flags['b']).toBe('feature/login');
  });

  it('parses git reset --hard HEAD~1', () => {
    const parsed = parseCommand('git reset --hard HEAD~1');
    expect(parsed.type).toBe('reset');
    expect(parsed.flags['hard']).toBe(true);
    expect(parsed.args).toEqual(['HEAD~1']);
  });

  it('parses file redirection commands', () => {
    const parsed = parseCommand('echo "hello world" > app.js');
    expect(parsed.type).toBe('echo');
    expect(parsed.targetFile).toBe('app.js');
    expect(parsed.fileContent).toBe('hello world\n');
    expect(parsed.append).toBe(false);
  });
});

describe('Suggestions & Autocomplete', () => {
  it('suggests closest git command for typos', () => {
    expect(findClosestGitCommand('marge')).toBe('merge');
    expect(findClosestGitCommand('comit')).toBe('commit');
    expect(findClosestGitCommand('chechout')).toBe('checkout');
  });

  it('provides autocomplete candidates', () => {
    const candidates = getAutocompleteCandidates('git che', ['main', 'feature'], ['app.js']);
    expect(candidates).toContain('git checkout');
  });
});
