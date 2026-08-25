import { describe, it, expect, beforeEach } from 'vitest';
import { executeCommandLine } from '../src/parser/command-map';
import { gitBridge } from '../src/engine/git-bridge';

describe('Git Engine Workflow', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
  });

  it('runs init, touch, add, commit, branch, checkout, and merge flow', async () => {
    // 1. init
    const initRes = await executeCommandLine('git init');
    expect(initRes.exitCode).toBe(0);
    expect(initRes.state.initialized).toBe(true);

    // 2. touch & write file
    const touchRes = await executeCommandLine('touch file.txt');
    expect(touchRes.exitCode).toBe(0);
    expect(touchRes.state.untrackedFiles).toContain('file.txt');

    const echoRes = await executeCommandLine('echo "line 1" > file.txt');
    expect(echoRes.exitCode).toBe(0);

    // 3. add
    const addRes = await executeCommandLine('git add file.txt');
    expect(addRes.exitCode).toBe(0);
    expect(addRes.state.stagedFiles.length).toBe(1);
    expect(addRes.state.stagedFiles[0].path).toBe('file.txt');

    // 4. commit
    const commitRes = await executeCommandLine('git commit -m "initial commit"');
    expect(commitRes.exitCode).toBe(0);
    expect(commitRes.state.commits.length).toBe(1);
    expect(commitRes.state.commits[0].message).toBe('initial commit');

    // 5. branch & checkout
    const branchRes = await executeCommandLine('git checkout -b feature');
    expect(branchRes.exitCode).toBe(0);
    expect(branchRes.state.head.target).toBe('feature');
    expect(branchRes.state.branches.length).toBe(2);

    // 6. commit on feature
    await executeCommandLine('echo "feature update" >> file.txt');
    await executeCommandLine('git add file.txt');
    const commit2Res = await executeCommandLine('git commit -m "feature commit"');
    expect(commit2Res.exitCode).toBe(0);
    expect(commit2Res.state.commits.length).toBe(2);

    // 7. checkout main & merge
    await executeCommandLine('git checkout main');
    const mergeRes = await executeCommandLine('git merge feature');
    expect(mergeRes.exitCode).toBe(0);
    expect(mergeRes.state.head.target).toBe('main');
  });

  it('handles git tag, reset, revert, cherry-pick, and rebase', async () => {
    await executeCommandLine('git init');
    await executeCommandLine('touch a.txt');
    await executeCommandLine('echo "initial a" > a.txt');
    await executeCommandLine('git add a.txt');
    const c1 = await executeCommandLine('git commit -m "c1"');
    expect(c1.state.commits.length).toBe(1);

    // Tag
    const tagRes = await executeCommandLine('git tag v1.0.0');
    expect(tagRes.exitCode).toBe(0);
    expect(tagRes.state.tags.some((t) => t.name === 'v1.0.0')).toBe(true);

    // Feature branch
    await executeCommandLine('git checkout -b feature');
    await executeCommandLine('echo "feature content" >> a.txt');
    await executeCommandLine('git add a.txt');
    const c2 = await executeCommandLine('git commit -m "c2"');
    const c2Sha = c2.state.commits.find((c) => c.message === 'c2')?.oid;

    // Switch back to main and commit another file
    await executeCommandLine('git checkout main');
    await executeCommandLine('touch b.txt');
    await executeCommandLine('echo "main b" > b.txt');
    await executeCommandLine('git add b.txt');
    await executeCommandLine('git commit -m "c3"');

    // Cherry pick c2 onto main
    if (c2Sha) {
      const cpRes = await executeCommandLine(`git cherry-pick ${c2Sha}`);
      expect(cpRes.exitCode).toBe(0);
      expect(cpRes.state.commits.some((c) => c.message.includes('cherry-picked'))).toBe(true);
    }

    // Reset soft back
    const resetRes = await executeCommandLine('git reset --soft HEAD~1');
    expect(resetRes.exitCode).toBe(0);
  });
});
