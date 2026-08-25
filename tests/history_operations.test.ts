import { beforeEach, describe, expect, it } from 'vitest';
import { gitBridge } from '../src/engine/git-bridge';
import { executeCommandLine } from '../src/parser/command-map';

async function run(command: string) {
  const result = await executeCommandLine(command);
  expect(result.exitCode, `${command}: ${result.stderr}`).toBe(0);
  return result;
}

describe('history-changing operations', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
  });

  it('cherry-picks the selected commit delta without removing unrelated branch files', async () => {
    await run('git init');
    await run('echo "base" > shared.txt');
    await run('git add shared.txt');
    await run('git commit -m "base"');
    await run('git checkout -b feature');
    await run('echo "feature" > shared.txt');
    await run('echo "feature-only" > feature.txt');
    await run('git add shared.txt feature.txt');
    const featureCommit = await run('git commit -m "feature work"');
    const featureOid = featureCommit.state.commits.find((commit) => commit.message === 'feature work')?.oid;
    expect(featureOid).toBeTruthy();

    await run('git checkout main');
    await run('echo "main-only" > main.txt');
    await run('git add main.txt');
    await run('git commit -m "main work"');
    await run(`git cherry-pick ${featureOid}`);

    expect((await run('cat shared.txt')).stdout).toContain('feature');
    expect((await run('cat feature.txt')).stdout).toContain('feature-only');
    expect((await run('cat main.txt')).stdout).toContain('main-only');
  });

  it('reverts only the selected commit and preserves later unrelated work', async () => {
    await run('git init');
    await run('echo "base" > shared.txt');
    await run('git add shared.txt');
    await run('git commit -m "base"');
    await run('echo "changed" > shared.txt');
    await run('git add shared.txt');
    const changedCommit = await run('git commit -m "change shared"');
    const changedOid = changedCommit.state.commits.find((commit) => commit.message === 'change shared')?.oid;
    expect(changedOid).toBeTruthy();
    await run('echo "later" > later.txt');
    await run('git add later.txt');
    await run('git commit -m "later work"');

    await run(`git revert ${changedOid}`);

    expect((await run('cat shared.txt')).stdout).toContain('base');
    expect((await run('cat later.txt')).stdout).toContain('later');
  });

  it('replays each feature commit delta on top of the upstream branch', async () => {
    await run('git init');
    await run('echo "base" > base.txt');
    await run('git add base.txt');
    await run('git commit -m "base"');
    await run('git checkout -b feature');
    await run('echo "feature one" > feature.txt');
    await run('git add feature.txt');
    await run('git commit -m "feature one"');
    await run('echo "feature two" >> feature.txt');
    await run('git add feature.txt');
    await run('git commit -m "feature two"');

    await run('git checkout main');
    await run('echo "upstream" > upstream.txt');
    await run('git add upstream.txt');
    await run('git commit -m "upstream work"');
    await run('git checkout feature');
    const rebase = await run('git rebase main');

    expect(rebase.stdout).toContain('Successfully rebased');
    expect((await run('cat feature.txt')).stdout).toContain('feature one\nfeature two');
    expect((await run('cat upstream.txt')).stdout).toContain('upstream');
    expect(gitBridge.getState().commits.map((commit) => commit.message)).toEqual(
      expect.arrayContaining(['feature one', 'feature two', 'upstream work'])
    );
  });
});
