import { describe, expect, it } from 'vitest';
import { RepoState } from '../src/model/types';
import { compareRepoStates, describeRepoChanges, tokenizeExplainerCommand } from '../src/ui/ExplainerMode/explainer-model';

const emptyState = (): RepoState => ({
  initialized: true,
  head: { type: 'branch', target: 'main', oid: '1111111111111111111111111111111111111111' },
  branches: [{ name: 'main', oid: '1111111111111111111111111111111111111111', isCurrent: true }],
  tags: [],
  commits: [],
  stagedFiles: [],
  unstagedFiles: [],
  untrackedFiles: [],
  stashes: [],
});

describe('Explainer comparison model', () => {
  it('highlights HEAD, refs, and file-state changes', () => {
    const before = emptyState();
    const after = emptyState();
    after.head = { ...after.head, target: 'feature/ui', oid: '2222222222222222222222222222222222222222' };
    after.branches = [...after.branches, { name: 'feature/ui', oid: after.head.oid!, isCurrent: true }];
    after.stagedFiles = [{ path: 'app.ts', status: 'added', staged: true }];

    const rows = compareRepoStates(before, after);
    expect(rows.find((row) => row.key === 'head')?.changed).toBe(true);
    expect(rows.find((row) => row.key === 'staged')?.after).toContain('app.ts');
    expect(describeRepoChanges(before, after).map((change) => change.title)).toContain('Branch added feature/ui');
  });

  it('labels a read-only result when repository state is identical', () => {
    const state = emptyState();
    expect(describeRepoChanges(state, emptyState())[0].kind).toBe('unchanged');
  });

  it('separates command options and revisions for beginner annotations', () => {
    const tokens = tokenizeExplainerCommand('git reset --soft HEAD~1');
    expect(tokens.map((token) => token.role)).toEqual(['program', 'command', 'option', 'revision']);
  });
});
