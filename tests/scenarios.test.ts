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
        expect(res.exitCode, `${step.command}: ${res.stderr}`).toBe(0);
      }
    });
  }

  it('replays completed steps with stable commit IDs', async () => {
    const scenario = SCENARIOS.find((item) => item.id === 'your-first-repo')!;
    const stepsToReplay = scenario.steps.slice(0, 10);
    const run = async () => {
      await gitBridge.send('RESET_REPO');
      for (let index = 0; index < stepsToReplay.length; index++) {
        await gitBridge.send('SET_COMMIT_TIME', { timestamp: 1_735_689_600 + index * 60 });
        const result = await executeCommandLine(stepsToReplay[index].command);
        expect(result.exitCode, stepsToReplay[index].command).toBe(0);
      }
      return gitBridge.getState().commits.map((commit) => commit.oid);
    };

    expect(await run()).toEqual(await run());
  });
});
