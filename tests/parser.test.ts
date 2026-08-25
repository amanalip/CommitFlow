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

  it('handles nested symbols and special characters in quotes', () => {
    const tokens = tokenizeCommandLine('echo "hello > world; let x = 10"');
    expect(tokens).toEqual(['echo', 'hello > world; let x = 10']);
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

  it('parses boolean flags without consuming following arguments', () => {
    const parsed = parseCommand('git commit --allow-empty -m "empty message"');
    expect(parsed.type).toBe('commit');
    expect(parsed.flags['allow-empty']).toBe(true);
    expect(parsed.flags['m']).toBe('empty message');
  });

  it('parses git commit --amend flag', () => {
    const parsed = parseCommand('git commit --amend -m "amended commit"');
    expect(parsed.type).toBe('commit');
    expect(parsed.flags['amend']).toBe(true);
    expect(parsed.flags['m']).toBe('amended commit');
  });

  it('parses git stash subcommands and flags', () => {
    const p1 = parseCommand('git stash');
    expect(p1.type).toBe('stash');

    const p2 = parseCommand('git stash pop');
    expect(p2.type).toBe('stash');
    expect(p2.args).toEqual(['pop']);

    const p3 = parseCommand('git stash -m "save wip"');
    expect(p3.type).toBe('stash');
    expect(p3.flags['m']).toBe('save wip');
  });

  it('parses git show and git diff commands', () => {
    const pDiff = parseCommand('git diff');
    expect(pDiff.type).toBe('diff');

    const pShow = parseCommand('git show HEAD~1');
    expect(pShow.type).toBe('show');
    expect(pShow.args).toEqual(['HEAD~1']);
  });

  it('parses git log flags --oneline and --graph', () => {
    const pLog = parseCommand('git log --oneline --graph');
    expect(pLog.type).toBe('log');
    expect(pLog.flags['oneline']).toBe(true);
    expect(pLog.flags['graph']).toBe(true);
  });

  it('parses file redirection commands with quotes correctly', () => {
    const parsed = parseCommand('echo "hello > world" > app.js');
    expect(parsed.type).toBe('echo');
    expect(parsed.targetFile).toBe('app.js');
    expect(parsed.fileContent).toBe('hello > world\n');
    expect(parsed.append).toBe(false);
  });

  it('parses file append redirection >> commands', () => {
    const parsed = parseCommand('echo "line 2" >> app.js');
    expect(parsed.type).toBe('echo');
    expect(parsed.targetFile).toBe('app.js');
    expect(parsed.fileContent).toBe('line 2\n');
    expect(parsed.append).toBe(true);
  });

  it('parses filesystem utility commands (touch, cat, ls, clear)', () => {
    const pTouch = parseCommand('touch a.js b.js');
    expect(pTouch.type).toBe('touch');
    expect(pTouch.args).toEqual(['a.js', 'b.js']);

    const pCat = parseCommand('cat a.js');
    expect(pCat.type).toBe('cat');
    expect(pCat.args).toEqual(['a.js']);

    const pLs = parseCommand('ls');
    expect(pLs.type).toBe('ls');

    const pClear = parseCommand('clear');
    expect(pClear.type).toBe('clear');
  });

  it('parses git branch delete flags -d, -D, and --delete', () => {
    const p1 = parseCommand('git branch -d feature');
    expect(p1.type).toBe('branch');
    expect(p1.flags['d']).toBe('feature');

    const p2 = parseCommand('git branch -D bugfix');
    expect(p2.type).toBe('branch');
    expect(p2.flags['D']).toBe('bugfix');

    const p3 = parseCommand('git branch --delete old-branch');
    expect(p3.type).toBe('branch');
    expect(p3.flags['delete']).toBe(true);
    expect(p3.args).toEqual(['old-branch']);
  });
});

describe('Suggestions & Autocomplete', () => {
  it('suggests closest git command for typos', () => {
    expect(findClosestGitCommand('marge')).toBe('merge');
    expect(findClosestGitCommand('comit')).toBe('commit');
    expect(findClosestGitCommand('chechout')).toBe('checkout');
    expect(findClosestGitCommand('stsh')).toBe('stash');
  });

  it('provides autocomplete candidates for branches and subcommands', () => {
    const candidates = getAutocompleteCandidates('git che', ['main', 'feature'], ['app.js']);
    expect(candidates).toContain('git checkout');

    const branchCandidates = getAutocompleteCandidates('git checkout fea', ['main', 'feature/login'], []);
    expect(branchCandidates).toContain('git checkout feature/login');

    const fileCandidates = getAutocompleteCandidates('git add in', ['main'], ['index.html', 'style.css']);
    expect(fileCandidates).toContain('git add index.html');
  });
});
