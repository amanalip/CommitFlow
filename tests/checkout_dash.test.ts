import { describe, it, expect, beforeEach } from 'vitest';
import { executeCommandLine } from '../src/parser/command-map';
import { gitBridge } from '../src/engine/git-bridge';

describe('Git Checkout / Switch Dash Feature', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
    await executeCommandLine('git init');
    await executeCommandLine('touch a.txt');
    await executeCommandLine('git add a.txt');
    await executeCommandLine('git commit -m "c1"');
  });

  it('switches back to previous branch with git checkout -', async () => {
    await executeCommandLine('git checkout -b feature');
    expect(gitBridge.getState().head.target).toBe('feature');

    const checkoutDashRes = await executeCommandLine('git checkout -');
    expect(checkoutDashRes.exitCode).toBe(0);
    expect(gitBridge.getState().head.target).toBe('main');

    // Toggle back to feature again
    const checkoutDashAgain = await executeCommandLine('git checkout -');
    expect(checkoutDashAgain.exitCode).toBe(0);
    expect(gitBridge.getState().head.target).toBe('feature');
  });

  it('switches back to previous branch with git switch -', async () => {
    await executeCommandLine('git switch -c feature-b');
    expect(gitBridge.getState().head.target).toBe('feature-b');

    const switchDashRes = await executeCommandLine('git switch -');
    expect(switchDashRes.exitCode).toBe(0);
    expect(gitBridge.getState().head.target).toBe('main');
  });
});
