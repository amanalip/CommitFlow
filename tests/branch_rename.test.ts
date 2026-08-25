import { describe, it, expect, beforeEach } from 'vitest';
import { executeCommandLine } from '../src/parser/command-map';
import { gitBridge } from '../src/engine/git-bridge';

describe('Git Branch Rename Command', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
    await executeCommandLine('git init');
    await executeCommandLine('touch readme.md');
    await executeCommandLine('git add readme.md');
    await executeCommandLine('git commit -m "initial"');
  });

  it('renames current active branch with git branch -m new-name', async () => {
    const renameRes = await executeCommandLine('git branch -m trunk');
    expect(renameRes.exitCode).toBe(0);

    const state = gitBridge.getState();
    expect(state.head.target).toBe('trunk');
    expect(state.branches.some((b) => b.name === 'trunk')).toBe(true);
    expect(state.branches.some((b) => b.name === 'main')).toBe(false);
  });

  it('renames specific branch with git branch -m old-name new-name', async () => {
    await executeCommandLine('git branch feature-v1');
    expect(gitBridge.getState().branches.some((b) => b.name === 'feature-v1')).toBe(true);

    const renameRes = await executeCommandLine('git branch -m feature-v1 feature-v2');
    expect(renameRes.exitCode).toBe(0);

    const state = gitBridge.getState();
    expect(state.branches.some((b) => b.name === 'feature-v2')).toBe(true);
    expect(state.branches.some((b) => b.name === 'feature-v1')).toBe(false);
  });
});
