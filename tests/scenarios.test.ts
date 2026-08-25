import { describe, it, expect, beforeEach } from 'vitest';
import { SCENARIOS } from '../src/scenarios/data';
import { executeCommandLine } from '../src/parser/command-map';
import { gitBridge } from '../src/engine/git-bridge';

describe('Learning Scenarios Execution', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
  });

  for (const scenario of SCENARIOS) {
    it(`executes all steps in scenario "${scenario.title}" without fatal parser errors`, async () => {
      await gitBridge.send('RESET_REPO');
      for (const step of scenario.steps) {
        const res = await executeCommandLine(step.command);
        expect(res.exitCode).toBe(0);
      }
    });
  }
});
