import { beforeEach, describe, expect, it } from 'vitest';
import { gitBridge } from '../src/engine/git-bridge';
import { executeCommandLine } from '../src/parser/command-map';

async function file(path: string) {
  return (await executeCommandLine(`cat ${path}`)).stdout;
}

describe('stash state restoration', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
    await executeCommandLine('git init');
    await executeCommandLine('echo "base" > mixed.txt');
    await executeCommandLine('echo "keep" > deleted.txt');
    await executeCommandLine('git add mixed.txt deleted.txt');
    await executeCommandLine('git commit -m "base"');
  });

  it('restores staged, unstaged, deleted, and untracked file states', async () => {
    await executeCommandLine('echo "staged" >> mixed.txt');
    await executeCommandLine('git add mixed.txt');
    await executeCommandLine('echo "unstaged" >> mixed.txt');
    await executeCommandLine('rm deleted.txt');
    await executeCommandLine('echo "draft" > notes.txt');

    const push = await executeCommandLine('git stash push -m "complete state"');
    expect(push.exitCode).toBe(0);
    expect(gitBridge.getState().stashes).toHaveLength(1);
    expect(gitBridge.getState().stagedFiles).toHaveLength(0);
    expect(gitBridge.getState().unstagedFiles).toHaveLength(0);
    expect(gitBridge.getState().untrackedFiles).toHaveLength(0);

    const pop = await executeCommandLine('git stash pop');
    expect(pop.exitCode).toBe(0);
    const state = gitBridge.getState();
    expect(state.stagedFiles.map((entry) => entry.path)).toContain('mixed.txt');
    expect(state.unstagedFiles.map((entry) => entry.path)).toEqual(
      expect.arrayContaining(['mixed.txt', 'deleted.txt']),
    );
    expect(state.untrackedFiles).toContain('notes.txt');
    expect(await file('mixed.txt')).toContain('staged\nunstaged');
    expect(await file('notes.txt')).toBe('draft\n');
  });

  it('pops the requested stash without removing newer entries', async () => {
    await executeCommandLine('echo "first" > notes.txt');
    await executeCommandLine('git stash push -m "first stash"');
    await executeCommandLine('echo "second" > notes.txt');
    await executeCommandLine('git stash push -m "second stash"');

    const pop = await executeCommandLine('git stash pop stash@{1}');
    expect(pop.exitCode).toBe(0);
    expect(await file('notes.txt')).toBe('first\n');
    expect(gitBridge.getState().stashes).toHaveLength(1);
    expect(gitBridge.getState().stashes[0].message).toContain('second stash');
  });

  it('drops only the requested stash without changing files', async () => {
    await executeCommandLine('echo "first" > notes.txt');
    await executeCommandLine('git stash push -m "first stash"');
    await executeCommandLine('echo "second" > notes.txt');
    await executeCommandLine('git stash push -m "second stash"');

    const drop = await executeCommandLine('git stash drop stash@{1}');
    expect(drop.exitCode).toBe(0);
    expect(gitBridge.getState().stashes).toHaveLength(1);
    expect(gitBridge.getState().stashes[0].message).toContain('second stash');
    expect(gitBridge.getState().untrackedFiles).toHaveLength(0);
  });
});
