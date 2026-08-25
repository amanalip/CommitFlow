import { describe, it, expect } from 'vitest';
import { formatStatusOutput, formatLogOutput, formatHelpText } from '../src/parser/output-formatter';
import { RepoState, CommitInfo } from '../src/model/types';

describe('Output Formatter', () => {
  it('formats status output for uninitialized repository', () => {
    const state: RepoState = {
      initialized: false,
      head: { type: 'branch', target: 'main' },
      branches: [],
      tags: [],
      commits: [],
      stagedFiles: [],
      unstagedFiles: [],
      untrackedFiles: [],
      stashes: [],
    };
    const output = formatStatusOutput(state);
    expect(output).toContain('fatal: not a git repository');
  });

  it('formats status output for clean working tree', () => {
    const state: RepoState = {
      initialized: true,
      head: { type: 'branch', target: 'main' },
      branches: [{ name: 'main', oid: '111', isCurrent: true }],
      tags: [],
      commits: [],
      stagedFiles: [],
      unstagedFiles: [],
      untrackedFiles: [],
      stashes: [],
    };
    const output = formatStatusOutput(state);
    expect(output).toContain('On branch');
    expect(output).toContain('nothing to commit, working tree clean');
  });

  it('formats status output with staged, unstaged, and untracked files', () => {
    const state: RepoState = {
      initialized: true,
      head: { type: 'branch', target: 'feature' },
      branches: [{ name: 'feature', oid: '222', isCurrent: true }],
      tags: [],
      commits: [],
      stagedFiles: [{ path: 'staged.js', status: 'added', staged: true }],
      unstagedFiles: [{ path: 'modified.js', status: 'modified', staged: false }],
      untrackedFiles: ['newfile.txt'],
      stashes: [],
    };
    const output = formatStatusOutput(state);
    expect(output).toContain('Changes to be committed:');
    expect(output).toContain('staged.js');
    expect(output).toContain('Changes not staged for commit:');
    expect(output).toContain('modified.js');
    expect(output).toContain('Untracked files:');
    expect(output).toContain('newfile.txt');
  });

  it('uses accurate short-status codes for staged changes', () => {
    const state: RepoState = {
      initialized: true,
      head: { type: 'branch', target: 'main' },
      branches: [{ name: 'main', oid: '111', isCurrent: true }],
      tags: [],
      commits: [],
      stagedFiles: [
        { path: 'added.js', status: 'added', staged: true },
        { path: 'changed.js', status: 'modified', staged: true },
        { path: 'removed.js', status: 'deleted', staged: true },
      ],
      unstagedFiles: [],
      untrackedFiles: [],
      stashes: [],
    };

    const output = formatStatusOutput(state, true);
    expect(output).toContain('A  added.js');
    expect(output).toContain('M  changed.js');
    expect(output).toContain('D  removed.js');
  });

  it('formats status output for detached HEAD', () => {
    const state: RepoState = {
      initialized: true,
      head: { type: 'detached', target: 'a1b2c3d', oid: 'a1b2c3d4e5f6' },
      branches: [],
      tags: [],
      commits: [],
      stagedFiles: [],
      unstagedFiles: [],
      untrackedFiles: [],
      stashes: [],
    };
    const output = formatStatusOutput(state);
    expect(output).toContain('HEAD detached at a1b2c3d');
  });

  it('formats log output oneline and multi-line formats', () => {
    const commits: CommitInfo[] = [
      {
        oid: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        shortOid: 'a1b2c3d',
        message: 'Initial commit',
        author: { name: 'Alice', email: 'alice@example.com', timestamp: 1700000000, timezoneOffset: 0 },
        committer: { name: 'Alice', email: 'alice@example.com', timestamp: 1700000000, timezoneOffset: 0 },
        parentOids: [],
        treeOid: 'tree1',
        branches: ['main'],
        tags: ['v0.1'],
        isHead: true,
      },
    ];

    const standard = formatLogOutput(commits, false, false);
    expect(standard).toContain('commit a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
    expect(standard).toContain('Author: Alice <alice@example.com>');
    expect(standard).toContain('Initial commit');
    expect(standard.match(/Date:/g)?.length).toBe(1);

    const oneline = formatLogOutput(commits, true, false);
    expect(oneline).toContain('a1b2c3d');
    expect(oneline).toContain('HEAD');
    expect(oneline).toContain('main');
    expect(oneline).toContain('tag: v0.1');
    expect(oneline).toContain('Initial commit');
  });

  it('formats help text with all supported git and shell commands', () => {
    const help = formatHelpText();
    expect(help).toContain('git init');
    expect(help).toContain('git commit');
    expect(help).toContain('git checkout');
    expect(help).toContain('git merge');
    expect(help).toContain('git rebase');
    expect(help).toContain('git stash');
    expect(help).toContain('git diff');
    expect(help).toContain('git show');
  });
});
