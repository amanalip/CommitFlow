import { beforeEach, describe, expect, it } from 'vitest';
import { gitBridge } from '../src/engine/git-bridge';
import { executeCommandLine } from '../src/parser/command-map';
import {
  EXPLAINER_PRESETS,
  getExplainerSetup,
} from '../src/ui/ExplainerMode/explainer-fixtures';

async function runSetup(command: string) {
  for (const setupCommand of getExplainerSetup(command)) {
    const result = await executeCommandLine(setupCommand);
    expect(result.exitCode, `setup command failed: ${setupCommand}`).toBe(0);
  }
}

describe('Explainer simulations', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
  });

  it('restores the exact playground runtime after an isolated simulation', async () => {
    await executeCommandLine('git init');
    await executeCommandLine('echo "playground" > playground.txt');
    await executeCommandLine('git add playground.txt');
    await executeCommandLine('git commit -m "playground commit"');

    const originalState = gitBridge.getState();
    const originalHead = originalState.head.oid;
    const originalFile = (await executeCommandLine('cat playground.txt')).stdout;

    const isolatedState = await gitBridge.runIsolated(async () => {
      await runSetup('git checkout -b feature/auth');
      await executeCommandLine('git checkout -b feature/auth');
      return gitBridge.getState();
    });

    expect(isolatedState.head.target).toBe('feature/auth');
    expect(gitBridge.getState().head.oid).toBe(originalHead);
    expect(gitBridge.getState().commits.map((commit) => commit.message)).toEqual(['playground commit']);
    expect((await executeCommandLine('cat playground.txt')).stdout).toBe(originalFile);
  });

  for (const preset of EXPLAINER_PRESETS) {
    it(`runs the ${preset.command} preset successfully`, async () => {
      const simulation = await gitBridge.runIsolated(async () => {
        await runSetup(preset.command);
        const before = gitBridge.getState();
        const result = await executeCommandLine(preset.command);
        return { before, result };
      });

      expect(simulation.result.exitCode).toBe(0);

      if (preset.id === 'commit') {
        expect(simulation.result.state.commits.length).toBe(simulation.before.commits.length + 1);
      }
      if (preset.id === 'amend') {
        expect(simulation.result.state.commits.length).toBe(simulation.before.commits.length);
        expect(simulation.result.state.head.oid).not.toBe(simulation.before.head.oid);
      }
      if (preset.id === 'merge') {
        expect(simulation.result.state.commits.at(-1)?.parentOids).toHaveLength(2);
      }
      if (preset.id === 'reset-soft') {
        expect(simulation.result.state.commits.length).toBe(simulation.before.commits.length - 1);
        expect(simulation.result.state.stagedFiles.length).toBeGreaterThan(0);
      }
      if (preset.id === 'revert') {
        expect(simulation.result.state.commits.length).toBe(simulation.before.commits.length + 1);
      }
      if (preset.id === 'tag-create') {
        expect(simulation.result.state.tags.map((tag) => tag.name)).toContain('v1.0.0');
      }
      if (preset.id === 'tag-delete') {
        expect(simulation.before.tags.map((tag) => tag.name)).toContain('v1.0.0');
        expect(simulation.result.state.tags.map((tag) => tag.name)).not.toContain('v1.0.0');
      }
    });
  }

  it('provides complete teaching metadata for a broad command library', () => {
    expect(EXPLAINER_PRESETS.length).toBeGreaterThanOrEqual(25);
    expect(new Set(EXPLAINER_PRESETS.map((preset) => preset.command)).size).toBe(EXPLAINER_PRESETS.length);
    for (const preset of EXPLAINER_PRESETS) {
      expect(preset.title).toBeTruthy();
      expect(preset.summary.length).toBeGreaterThan(24);
      expect(preset.whenToUse.length).toBeGreaterThan(24);
      expect(preset.caution.length).toBeGreaterThan(24);
      expect(preset.reads.length).toBeGreaterThan(0);
      expect(preset.changes.length).toBeGreaterThan(0);
      expect(preset.concepts.length).toBeGreaterThanOrEqual(3);
    }
  });
});
