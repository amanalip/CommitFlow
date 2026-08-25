import { beforeEach, describe, expect, it } from 'vitest';
import { gitBridge } from '../src/engine/git-bridge';
import { executeCommandLine } from '../src/parser/command-map';
import { SCENARIOS } from '../src/scenarios/data';

async function runScenario(id: string) {
  const scenario = SCENARIOS.find((item) => item.id === id);
  if (!scenario) throw new Error(`Missing scenario ${id}`);
  for (const step of scenario.steps) {
    const result = await executeCommandLine(step.command);
    expect(result.exitCode, `${scenario.title}: ${step.command}`).toBe(0);
  }
  return gitBridge.getState();
}

describe('advanced lesson outcomes', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
  });

  it('finishes cherry-pick with the copied file and a new commit identity on main', async () => {
    const state = await runScenario('cherry-picking');
    const main = state.branches.find((branch) => branch.name === 'main');
    const source = state.branches.find((branch) => branch.name === 'bugfix/hotfix');
    expect(state.head).toMatchObject({ type: 'branch', target: 'main' });
    expect((await executeCommandLine('cat patch.txt')).stdout).toBe('patch 1\n');
    expect(main?.oid).not.toBe(source?.oid);
    expect(state.commits.find((commit) => commit.oid === main?.oid)?.message).toContain('fix: critical security bug');
  });

  it('finishes rebase with feature content replayed directly above main', async () => {
    const state = await runScenario('rebasing-a-feature');
    const main = state.branches.find((branch) => branch.name === 'main');
    const head = state.commits.find((commit) => commit.isHead);
    expect(state.head).toMatchObject({ type: 'branch', target: 'feature/ui' });
    expect(head?.parentOids).toEqual([main?.oid]);
    expect((await executeCommandLine('cat button.js')).stdout).toBe('button component\n');
    const featureBase = (await executeCommandLine('cat base.txt')).stdout;
    await executeCommandLine('git checkout main');
    const mainBase = (await executeCommandLine('cat base.txt')).stdout;
    await executeCommandLine('git checkout feature/ui');
    expect({ featureBase, mainBase }).toEqual({
      featureBase: expect.stringContaining('updated docs'),
      mainBase: expect.stringContaining('updated docs'),
    });
  });

  it('finishes detached HEAD recovery attached to a preserving branch', async () => {
    const state = await runScenario('detached-head-recovery');
    const recovery = state.branches.find((branch) => branch.name === 'experiment-branch');
    expect(state.head).toMatchObject({ type: 'branch', target: 'experiment-branch' });
    expect(recovery?.oid).toBe(state.head.oid);
    expect((await executeCommandLine('cat experiment.txt')).stdout).toBe('experimental change\n');
  });

  it('finishes undo lesson with an inverse commit and no broken file', async () => {
    const state = await runScenario('undoing-mistakes');
    expect(state.commits.at(-1)?.message).toContain('Revert');
    expect((await executeCommandLine('ls')).stdout).not.toContain('bug.txt');
    expect((await executeCommandLine('cat app.txt')).stdout).toBe('v1\n');
  });

  it('finishes stash lesson with restored work committed and no stash left', async () => {
    const state = await runScenario('stashing-work-in-progress');
    expect(state.stashes).toHaveLength(0);
    expect(state.stagedFiles).toHaveLength(0);
    expect(state.unstagedFiles).toHaveLength(0);
    expect((await executeCommandLine('cat dashboard.txt')).stdout).toContain('work in progress');
    expect(state.commits.at(-1)?.message).toBe('feat: add dashboard filters');
  });
});
