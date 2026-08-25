import { beforeEach, describe, expect, it } from 'vitest';
import { gitBridge } from '../src/engine/git-bridge';
import { executeCommandLine } from '../src/parser/command-map';

describe('branch deletion safety', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
    await executeCommandLine('git init');
    await executeCommandLine('echo "base" > app.txt');
    await executeCommandLine('git add app.txt');
    await executeCommandLine('git commit -m "base"');
  });

  it('rejects -d for an unmerged branch and allows -D', async () => {
    await executeCommandLine('git checkout -b feature');
    await executeCommandLine('echo "feature" >> app.txt');
    await executeCommandLine('git add app.txt');
    await executeCommandLine('git commit -m "feature"');
    await executeCommandLine('git checkout main');

    const safeDelete = await executeCommandLine('git branch -d feature');
    expect(safeDelete.exitCode).toBe(1);
    expect(safeDelete.stderr).toContain('not fully merged');
    expect(gitBridge.getState().branches.some((branch) => branch.name === 'feature')).toBe(true);

    const forceDelete = await executeCommandLine('git branch -D feature');
    expect(forceDelete.exitCode).toBe(0);
    expect(gitBridge.getState().branches.some((branch) => branch.name === 'feature')).toBe(false);
  });

  it('allows -d after the branch is merged', async () => {
    await executeCommandLine('git checkout -b feature');
    await executeCommandLine('echo "feature" >> app.txt');
    await executeCommandLine('git add app.txt');
    await executeCommandLine('git commit -m "feature"');
    await executeCommandLine('git checkout main');
    await executeCommandLine('git merge feature');

    const result = await executeCommandLine('git branch -d feature');
    expect(result.exitCode).toBe(0);
    expect(gitBridge.getState().branches.some((branch) => branch.name === 'feature')).toBe(false);
  });
});
