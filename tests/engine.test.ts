import { describe, it, expect, beforeEach } from 'vitest';
import { executeCommandLine } from '../src/parser/command-map';
import { gitBridge } from '../src/engine/git-bridge';

describe('Git Engine Workflow', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
  });

  it('runs init, touch, add, commit, branch, checkout, and merge flow', async () => {
    const initRes = await executeCommandLine('git init');
    expect(initRes.exitCode).toBe(0);
    expect(initRes.state.initialized).toBe(true);

    const touchRes = await executeCommandLine('touch file.txt');
    expect(touchRes.exitCode).toBe(0);
    expect(touchRes.state.untrackedFiles).toContain('file.txt');

    const echoRes = await executeCommandLine('echo "line 1" > file.txt');
    expect(echoRes.exitCode).toBe(0);

    const addRes = await executeCommandLine('git add file.txt');
    expect(addRes.exitCode).toBe(0);
    expect(addRes.state.stagedFiles.length).toBe(1);
    expect(addRes.state.stagedFiles[0].path).toBe('file.txt');

    const commitRes = await executeCommandLine('git commit -m "initial commit"');
    expect(commitRes.exitCode).toBe(0);
    expect(commitRes.state.commits.length).toBe(1);
    expect(commitRes.state.commits[0].message).toBe('initial commit');

    const branchRes = await executeCommandLine('git checkout -b feature');
    expect(branchRes.exitCode).toBe(0);
    expect(branchRes.state.head.target).toBe('feature');
    expect(branchRes.state.branches.length).toBe(2);

    await executeCommandLine('echo "feature update" >> file.txt');
    await executeCommandLine('git add file.txt');
    const commit2Res = await executeCommandLine('git commit -m "feature commit"');
    expect(commit2Res.exitCode).toBe(0);
    expect(commit2Res.state.commits.length).toBe(2);

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

    const detachRes = await executeCommandLine(`git checkout ${rootOid}`);
    expect(detachRes.exitCode).toBe(0);
    expect(detachRes.state.head.type).toBe('detached');

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

    const softRes = await executeCommandLine('git reset --soft HEAD~1');
    expect(softRes.exitCode).toBe(0);
    expect(softRes.state.commits.length).toBe(1);

    await executeCommandLine('git commit -m "c2-again"');

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

    const tagRes = await executeCommandLine('git tag v1.0.0');
    expect(tagRes.exitCode).toBe(0);
    expect(tagRes.state.tags.some((t) => t.name === 'v1.0.0')).toBe(true);

    await executeCommandLine('git checkout -b feature');
    await executeCommandLine('echo "feature content" >> a.txt');
    await executeCommandLine('git add a.txt');
    const c2 = await executeCommandLine('git commit -m "c2"');
    const c2Sha = c2.state.commits.find((c) => c.message === 'c2')?.oid;

    await executeCommandLine('git checkout main');
    await executeCommandLine('touch b.txt');
    await executeCommandLine('echo "main b" > b.txt');
    await executeCommandLine('git add b.txt');
    await executeCommandLine('git commit -m "c3"');

    if (c2Sha) {
      const cpRes = await executeCommandLine(`git cherry-pick ${c2Sha}`);
      expect(cpRes.exitCode).toBe(0);
      expect(cpRes.state.commits.some((c) => c.message.includes('cherry-picked'))).toBe(true);
    }

    const revRes = await executeCommandLine('git revert HEAD');
    expect(revRes.exitCode).toBe(0);
    expect(revRes.state.commits.some((c) => c.message.startsWith('Revert'))).toBe(true);
  });

  it('handles git diff and git show', async () => {
    await executeCommandLine('git init');
    await executeCommandLine('echo "hello world" > app.js');
    await executeCommandLine('git add app.js');
    await executeCommandLine('git commit -m "feat: first commit"');

    await executeCommandLine('echo "new line" >> app.js');
    const diffRes = await executeCommandLine('git diff');
    expect(diffRes.exitCode).toBe(0);
    expect(diffRes.stdout).toContain('+ new line');

    const showRes = await executeCommandLine('git show HEAD');
    expect(showRes.exitCode).toBe(0);
    expect(showRes.stdout).toContain('feat: first commit');
  });

  it('handles git stash push and pop flow', async () => {
    await executeCommandLine('git init');
    await executeCommandLine('echo "initial" > file.txt');
    await executeCommandLine('git add file.txt');
    await executeCommandLine('git commit -m "c1"');

    await executeCommandLine('echo "wip changes" >> file.txt');
    const stashRes = await executeCommandLine('git stash');
    expect(stashRes.exitCode).toBe(0);
    expect(gitBridge.getState().stashes.length).toBe(1);

    const popRes = await executeCommandLine('git stash pop');
    expect(popRes.exitCode).toBe(0);
    expect(gitBridge.getState().stashes.length).toBe(0);
  });

  it('handles git commit --amend', async () => {
    await executeCommandLine('git init');
    await executeCommandLine('echo "initial" > file.txt');
    await executeCommandLine('git add file.txt');
    await executeCommandLine('git commit -m "initial typo"');

    const amendRes = await executeCommandLine('git commit --amend -m "initial fixed"');
    expect(amendRes.exitCode).toBe(0);
    expect(gitBridge.getState().commits[0].message).toBe('initial fixed');
  });

  it('handles filesystem commands: cat, touch, ls, and rm', async () => {
    await executeCommandLine('git init');
    await executeCommandLine('echo "Hello CommitFlow" > greeting.txt');
    const catRes = await executeCommandLine('cat greeting.txt');
    expect(catRes.stdout).toContain('Hello CommitFlow');

    const lsRes = await executeCommandLine('ls');
    expect(lsRes.stdout).toContain('greeting.txt');

    await executeCommandLine('rm greeting.txt');
    const lsAfter = await executeCommandLine('ls');
    expect(lsAfter.stdout).not.toContain('greeting.txt');
  });

  it('handles multi-file staging and creation', async () => {
    await executeCommandLine('git init');
    await executeCommandLine('touch a.js b.js c.js');
    expect(gitBridge.getState().untrackedFiles.length).toBe(3);

    await executeCommandLine('git add a.js b.js');
    expect(gitBridge.getState().stagedFiles.length).toBe(2);
    expect(gitBridge.getState().untrackedFiles.length).toBe(1);
  });

  it('handles tag deletion', async () => {
    await executeCommandLine('git init');
    await executeCommandLine('touch file.txt');
    await executeCommandLine('git add file.txt');
    await executeCommandLine('git commit -m "c1"');

    await executeCommandLine('git tag release-v1');
    expect(gitBridge.getState().tags.some((t) => t.name === 'release-v1')).toBe(true);

    const delRes = await executeCommandLine('git tag -d release-v1');
    expect(delRes.exitCode).toBe(0);
    expect(gitBridge.getState().tags.some((t) => t.name === 'release-v1')).toBe(false);
  });
});
