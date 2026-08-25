import { beforeEach, describe, expect, it } from 'vitest';
import { executeCommandLine } from '../src/parser/command-map';
import { gitBridge } from '../src/engine/git-bridge';

describe('Git rm routing', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
    await executeCommandLine('git init');
    await executeCommandLine('echo "tracked" > tracked.txt');
    await executeCommandLine('git add tracked.txt');
    await executeCommandLine('git commit -m "add tracked file"');
  });

  it('removes a working-tree file and stages its deletion', async () => {
    const result = await executeCommandLine('git rm tracked.txt');

    expect(result.exitCode).toBe(0);
    expect(result.state.stagedFiles).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'tracked.txt', status: 'deleted' })])
    );
    expect((await executeCommandLine('ls')).stdout).not.toContain('tracked.txt');
  });

  it('removes a file from the index but leaves it in the working tree with --cached', async () => {
    const result = await executeCommandLine('git rm --cached tracked.txt');

    expect(result.exitCode).toBe(0);
    expect(result.state.untrackedFiles).toContain('tracked.txt');
    expect((await executeCommandLine('ls')).stdout).toContain('tracked.txt');
  });

  it('keeps shell rm as a filesystem-only command', async () => {
    const result = await executeCommandLine('rm tracked.txt');

    expect(result.exitCode).toBe(0);
    expect(result.state.unstagedFiles).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'tracked.txt', status: 'deleted' })])
    );
  });

  it('supports commit -am by staging tracked changes before committing', async () => {
    await executeCommandLine('echo "updated" > tracked.txt');
    const result = await executeCommandLine('git commit -am "update tracked file"');

    expect(result.exitCode).toBe(0);
    expect(result.state.commits.at(-1)?.message).toBe('update tracked file');
    expect(result.state.unstagedFiles).toHaveLength(0);
  });
});
