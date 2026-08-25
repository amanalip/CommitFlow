import { beforeEach, describe, expect, it } from 'vitest';
import { gitBridge } from '../src/engine/git-bridge';
import { executeCommandLine } from '../src/parser/command-map';

async function run(command: string) {
  const result = await executeCommandLine(command);
  expect(result.exitCode, `${command}: ${result.stderr}`).toBe(0);
  return result;
}

async function createTwoCommitHistory() {
  await run('git init');
  await run('echo "one" > file.txt');
  await run('git add file.txt');
  await run('git commit -m "one"');
  await run('echo "two" > file.txt');
  await run('git add file.txt');
  await run('git commit -m "two"');
}

describe('git reset modes', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
  });

  it('soft reset moves HEAD while preserving the index and working tree', async () => {
    await createTwoCommitHistory();
    const result = await run('git reset --soft HEAD~1');

    expect(result.state.head).toEqual(expect.objectContaining({ type: 'branch', target: 'main' }));
    expect(result.state.commits).toHaveLength(1);
    expect(result.state.stagedFiles).toEqual([
      expect.objectContaining({ path: 'file.txt', status: 'modified', staged: true }),
    ]);
    expect(result.state.unstagedFiles).toHaveLength(0);
    expect((await run('cat file.txt')).stdout).toContain('two');
  });

  it('mixed reset resets the index but preserves working-tree changes', async () => {
    await createTwoCommitHistory();
    await run('echo "three" > file.txt');
    const result = await run('git reset --mixed HEAD~1');

    expect(result.state.head).toEqual(expect.objectContaining({ type: 'branch', target: 'main' }));
    expect(result.state.commits).toHaveLength(1);
    expect(result.state.stagedFiles).toHaveLength(0);
    expect(result.state.unstagedFiles).toEqual([
      expect.objectContaining({ path: 'file.txt', status: 'modified', staged: false }),
    ]);
    expect((await run('cat file.txt')).stdout).toContain('three');
  });

  it('hard reset resets the index and tracked working tree without detaching HEAD', async () => {
    await createTwoCommitHistory();
    await run('echo "three" > file.txt');
    const result = await run('git reset --hard HEAD~1');

    expect(result.state.head).toEqual(expect.objectContaining({ type: 'branch', target: 'main' }));
    expect(result.state.commits).toHaveLength(1);
    expect(result.state.stagedFiles).toHaveLength(0);
    expect(result.state.unstagedFiles).toHaveLength(0);
    expect((await run('cat file.txt')).stdout).toContain('one');
  });
});
