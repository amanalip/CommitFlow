import { describe, it, expect, beforeEach } from 'vitest';
import { executeCommandLine } from '../src/parser/command-map';
import { gitBridge } from '../src/engine/git-bridge';

describe('Commit Inspector Metadata Model', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
    await executeCommandLine('git init');
  });

  it('populates commit metadata with author, committer, tree, and branch tags', async () => {
    await executeCommandLine('touch app.js');
    await executeCommandLine('git add app.js');
    const commitRes = await executeCommandLine('git commit -m "feat: user authentication"');
    expect(commitRes.exitCode).toBe(0);

    const state = gitBridge.getState();
    expect(state.commits.length).toBe(1);

    const commit = state.commits[0];
    expect(commit.oid).toHaveLength(40);
    expect(commit.shortOid).toHaveLength(7);
    expect(commit.author.name).toBe('CommitFlow User');
    expect(commit.author.email).toBe('user@commitflow.dev');
    expect(commit.treeOid).toBeTruthy();
    expect(commit.branches).toContain('main');
    expect(commit.isHead).toBe(true);
  });
});
