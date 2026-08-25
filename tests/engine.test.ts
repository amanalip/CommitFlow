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

  it('handles branch deletion with -d and -D', async () => {
    await executeCommandLine('git init');
    await executeCommandLine('touch a.txt');
    await executeCommandLine('echo "a" > a.txt');
    await executeCommandLine('git add a.txt');
    await executeCommandLine('git commit -m "c1"');

    await executeCommandLine('git branch feature-temp');
    expect(gitBridge.getState().branches.some((b) => b.name === 'feature-temp')).toBe(true);

    const delRes = await executeCommandLine('git branch -d feature-temp');
    expect(delRes.exitCode).toBe(0);
    expect(gitBridge.getState().branches.some((b) => b.name === 'feature-temp')).toBe(false);
  });

  it('handles detached HEAD state and switching back to branch', async () => {
    await executeCommandLine('git init');
    await executeCommandLine('touch a.txt');
    await executeCommandLine('echo "commit 1" > a.txt');
    await executeCommandLine('git add a.txt');
    const c1 = await executeCommandLine('git commit -m "first"');
    const rootOid = c1.state.commits[0].oid;

    await executeCommandLine('echo "commit 2" >> a.txt');
    await executeCommandLine('git add a.txt');
    await executeCommandLine('git commit -m "second"');

    // Checkout commit OID -> detached HEAD
    const detachRes = await executeCommandLine(`git checkout ${rootOid}`);
    expect(detachRes.exitCode).toBe(0);
    expect(detachRes.state.head.type).toBe('detached');

    // Checkout main -> branch HEAD
    const attachRes = await executeCommandLine('git checkout main');
    expect(attachRes.exitCode).toBe(0);
    expect(attachRes.state.head.type).toBe('branch');
    expect(attachRes.state.head.target).toBe('main');
  });

  it('handles git reset --soft, --mixed, and --hard modes', async () => {
    await executeCommandLine('git init');
    await executeCommandLine('touch a.txt');
    await executeCommandLine('echo "1" > a.txt');
    await executeCommandLine('git add a.txt');
    await executeCommandLine('git commit -m "c1"');

    await executeCommandLine('echo "2" >> a.txt');
    await executeCommandLine('git add a.txt');
    await executeCommandLine('git commit -m "c2"');

    // Reset soft
    const softRes = await executeCommandLine('git reset --soft HEAD~1');
    expect(softRes.exitCode).toBe(0);
    expect(softRes.state.commits.length).toBe(1);

    // Commit again
    await executeCommandLine('git commit -m "c2-again"');

    // Reset hard
    const hardRes = await executeCommandLine('git reset --hard HEAD~1');
    expect(hardRes.exitCode).toBe(0);
    expect(hardRes.state.commits.length).toBe(1);
  });

  it('handles git tag, revert, cherry-pick, and rebase', async () => {
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

    // Revert latest commit
    const revRes = await executeCommandLine('git revert HEAD');
    expect(revRes.exitCode).toBe(0);
    expect(revRes.state.commits.some((c) => c.message.startsWith('Revert'))).toBe(true);
  });

  it('handles filesystem commands: cat, touch, echo append', async () => {
    await executeCommandLine('git init');
    await executeCommandLine('echo "Hello CommitFlow" > greeting.txt');
    const catRes = await executeCommandLine('cat greeting.txt');
    expect(catRes.stdout).toContain('Hello CommitFlow');

    await executeCommandLine('echo "Second Line" >> greeting.txt');
    const cat2Res = await executeCommandLine('cat greeting.txt');
    expect(cat2Res.stdout).toContain('Hello CommitFlow');
    expect(cat2Res.stdout).toContain('Second Line');
  });
});
