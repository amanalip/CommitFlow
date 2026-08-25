import { describe, it, expect, beforeEach } from 'vitest';
import { executeCommandLine } from '../src/parser/command-map';
import { gitBridge } from '../src/engine/git-bridge';

describe('Git Staged Diff Command', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
    await executeCommandLine('git init');
  });

  it('shows staged diff with git diff --staged', async () => {
    await executeCommandLine('echo "first line" > app.ts');
    await executeCommandLine('git add app.ts');

    const diffRes = await executeCommandLine('git diff --staged');
    expect(diffRes.exitCode).toBe(0);
    expect(diffRes.stdout).toContain('staged new file');
    expect(diffRes.stdout).toContain('+ first line');
  });

  it('shows staged diff for modifications with git diff --cached', async () => {
    await executeCommandLine('echo "initial" > app.ts');
    await executeCommandLine('git add app.ts');
    await executeCommandLine('git commit -m "c1"');

    await executeCommandLine('echo "modified staged" > app.ts');
    await executeCommandLine('git add app.ts');

    const diffCachedRes = await executeCommandLine('git diff --cached');
    expect(diffCachedRes.exitCode).toBe(0);
    expect(diffCachedRes.stdout).toContain('staged modification');
    expect(diffCachedRes.stdout).toContain('+ modified staged');
  });

  it('tracks staged and unstaged versions of the same file independently', async () => {
    await executeCommandLine('echo "base" > app.ts');
    await executeCommandLine('git add app.ts');
    await executeCommandLine('git commit -m "add app"');

    await executeCommandLine('echo "staged line" >> app.ts');
    await executeCommandLine('git add app.ts');
    await executeCommandLine('echo "working line" >> app.ts');

    const stateBeforeCommit = gitBridge.getState();
    expect(stateBeforeCommit.stagedFiles.map((file) => file.path)).toContain('app.ts');
    expect(stateBeforeCommit.unstagedFiles.map((file) => file.path)).toContain('app.ts');

    const stagedDiff = await executeCommandLine('git diff --staged');
    const workingDiff = await executeCommandLine('git diff');
    expect(stagedDiff.stdout).toContain('+ staged line');
    expect(workingDiff.stdout).toContain('+ working line');

    const commit = await executeCommandLine('git commit -m "save staged work"');
    expect(commit.exitCode).toBe(0);
    expect(gitBridge.getState().stagedFiles.map((file) => file.path)).not.toContain('app.ts');
    expect(gitBridge.getState().unstagedFiles.map((file) => file.path)).toContain('app.ts');
  });
});
