import { describe, it, expect, beforeEach } from 'vitest';
import { executeCommandLine } from '../src/parser/command-map';
import { gitBridge } from '../src/engine/git-bridge';

describe('Git Short Status & Log Limits', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
    await executeCommandLine('git init');
  });

  it('formats short status with git status -s', async () => {
    await executeCommandLine('touch a.js b.js');
    await executeCommandLine('git add a.js');

    const statusRes = await executeCommandLine('git status -s');
    expect(statusRes.exitCode).toBe(0);
    expect(statusRes.stdout).toContain('M  a.js');
    expect(statusRes.stdout).toContain('?? b.js');
  });

  it('limits log entries with git log -n', async () => {
    await executeCommandLine('echo "1" > a.js');
    await executeCommandLine('git add a.js');
    await executeCommandLine('git commit -m "c1"');

    await executeCommandLine('echo "2" > a.js');
    await executeCommandLine('git add a.js');
    await executeCommandLine('git commit -m "c2"');

    const logRes = await executeCommandLine('git log --oneline -n 1');
    expect(logRes.exitCode).toBe(0);
    expect(logRes.stdout).toContain('c2');
    expect(logRes.stdout).not.toContain('c1');
  });
});
