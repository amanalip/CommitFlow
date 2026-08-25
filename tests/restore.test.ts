import { describe, it, expect, beforeEach } from 'vitest';
import { executeCommandLine } from '../src/parser/command-map';
import { gitBridge } from '../src/engine/git-bridge';

describe('Git Restore Command', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
    await executeCommandLine('git init');
  });

  it('restores unstaged modified file back to HEAD state', async () => {
    await executeCommandLine('echo "initial line" > index.js');
    await executeCommandLine('git add index.js');
    await executeCommandLine('git commit -m "initial commit"');

    // Modify file
    await executeCommandLine('echo "broken line" > index.js');
    expect(gitBridge.getState().unstagedFiles.length).toBe(1);

    // Restore file
    const restoreRes = await executeCommandLine('git restore index.js');
    expect(restoreRes.exitCode).toBe(0);

    const catRes = await executeCommandLine('cat index.js');
    expect(catRes.stdout).toContain('initial line');
  });

  it('unstages staged file using git restore --staged', async () => {
    await executeCommandLine('echo "initial" > index.js');
    await executeCommandLine('git add index.js');
    await executeCommandLine('git commit -m "c1"');

    await executeCommandLine('echo "staged modification" > index.js');
    await executeCommandLine('git add index.js');
    expect(gitBridge.getState().stagedFiles.length).toBe(1);

    const restoreStagedRes = await executeCommandLine('git restore --staged index.js');
    expect(restoreStagedRes.exitCode).toBe(0);
    expect(gitBridge.getState().stagedFiles.length).toBe(0);
    expect(gitBridge.getState().unstagedFiles.length).toBe(1);
  });
});
