import { beforeEach, describe, expect, it } from 'vitest';
import { gitBridge } from '../src/engine/git-bridge';
import { executeCommandLine } from '../src/parser/command-map';

describe('Git help', () => {
  beforeEach(async () => {
    await gitBridge.send('RESET_REPO');
  });

  it.each(['git --help', 'git -h', 'git help'])(
    'shows the supported command reference for %s before repository initialization',
    async (command) => {
      const result = await executeCommandLine(command);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('CommitFlow - In-Browser Git Playground');
      expect(result.stdout).toContain('git help <command>');
      expect(result.stderr).toBe('');
    }
  );

  it.each(['git help rebase', 'git rebase --help', 'git rebase -h'])(
    'shows focused examples and simulation behavior for %s',
    async (command) => {
      const result = await executeCommandLine(command);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('git rebase');
      expect(result.stdout).toContain('Examples');
      expect(result.stdout).toContain('new commit IDs');
      expect(result.stderr).toBe('');
    }
  );

  it('returns a useful error for an unsupported help topic', async () => {
    const result = await executeCommandLine('git help clone');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("no simulated help topic for 'clone'");
    expect(result.stderr).toContain("git --help");
  });
});
