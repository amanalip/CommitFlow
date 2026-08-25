import { parseCommand } from './command-parser';
import { findClosestGitCommand } from './suggestions';
import { formatStatusOutput, formatLogOutput, formatHelpText } from './output-formatter';
import { gitBridge } from '../engine/git-bridge';
import { CommandResult } from '../model/types';

export async function executeCommandLine(rawInput: string): Promise<CommandResult> {
  const parsed = parseCommand(rawInput);
  let state = gitBridge.getState();

  if (parsed.type === 'unknown') {
    if (parsed.error?.includes('is not a git command')) {
      const parts = rawInput.trim().split(/\s+/);
      const sub = parts[1] || '';
      const suggestion = findClosestGitCommand(sub);
      let msg = `\x1b[31mgit: '${sub}' is not a git command. See 'git --help'.\x1b[0m`;
      if (suggestion) {
        msg += `\n\nDid you mean: \x1b[32mgit ${suggestion}\x1b[0m?`;
      }
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: msg,
        exitCode: 1,
        explanation: `Unknown command "${sub}".`,
        state,
      };
    }

    return {
      rawCommand: rawInput,
      stdout: '',
      stderr: `\x1b[31m${parsed.error || 'command not found'}\x1b[0m`,
      exitCode: 127,
      state,
    };
  }

  if (parsed.type === 'help') {
    return {
      rawCommand: rawInput,
      stdout: formatHelpText(),
      stderr: '',
      exitCode: 0,
      explanation: 'Displayed list of available commands and usage.',
      state,
    };
  }

  if (parsed.type === 'clear') {
    return {
      rawCommand: rawInput,
      stdout: '\x1b[2J\x1b[H',
      stderr: '',
      exitCode: 0,
      state,
    };
  }

  // Filesystem commands
  if (parsed.type === 'touch') {
    if (parsed.args.length === 0) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mtouch: missing file operand\x1b[0m',
        exitCode: 1,
        state,
      };
    }
    for (const file of parsed.args) {
      await gitBridge.send('WRITE_FILE', { path: file, content: '', append: true });
    }
    state = gitBridge.getState();
    return {
      rawCommand: rawInput,
      stdout: '',
      stderr: '',
      exitCode: 0,
      explanation: `Created file(s): ${parsed.args.join(', ')}.`,
      state,
    };
  }

  if (parsed.type === 'echo') {
    if (parsed.targetFile) {
      await gitBridge.send('WRITE_FILE', {
        path: parsed.targetFile,
        content: parsed.fileContent || '',
        append: parsed.append,
      });
      state = gitBridge.getState();
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '',
        exitCode: 0,
        explanation: `${parsed.append ? 'Appended to' : 'Wrote to'} ${parsed.targetFile}.`,
        state,
      };
    }
    return {
      rawCommand: rawInput,
      stdout: parsed.args.join(' '),
      stderr: '',
      exitCode: 0,
      state,
    };
  }

  if (parsed.type === 'cat') {
    if (parsed.args.length === 0) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mcat: missing file operand\x1b[0m',
        exitCode: 1,
        state,
      };
    }
    const res = await gitBridge.send('READ_FILE', { path: parsed.args[0] });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31mcat: ${parsed.args[0]}: No such file\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      state: res.state,
    };
  }

  if (parsed.type === 'ls') {
    const files = [...state.stagedFiles, ...state.unstagedFiles].map((f) => f.path);
    for (const u of state.untrackedFiles) {
      if (!files.includes(u)) files.push(u);
    }
    return {
      rawCommand: rawInput,
      stdout: files.sort().join('  '),
      stderr: '',
      exitCode: 0,
      state,
    };
  }

  // Git commands
  if (parsed.type === 'init') {
    const branchName = (parsed.flags['b'] || parsed.flags['initial-branch'] || 'main') as string;
    const res = await gitBridge.send('INIT', { defaultBranch: branchName });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: `Initialized a new Git repository with default branch "${branchName}".`,
      state: res.state,
    };
  }

  if (!state.initialized) {
    return {
      rawCommand: rawInput,
      stdout: '',
      stderr: '\x1b[31mfatal: not a git repository (or any of the parent directories): .git\x1b[0m',
      exitCode: 128,
      explanation: 'Attempted to run git command outside an initialized repository.',
      state,
    };
  }

  if (parsed.type === 'status') {
    return {
      rawCommand: rawInput,
      stdout: formatStatusOutput(state),
      stderr: '',
      exitCode: 0,
      explanation: 'Inspected status of the working tree and staging area.',
      state,
    };
  }

  if (parsed.type === 'log') {
    const oneline = Boolean(parsed.flags['oneline']);
    const graph = Boolean(parsed.flags['graph']);
    return {
      rawCommand: rawInput,
      stdout: formatLogOutput(state.commits, oneline, graph),
      stderr: '',
      exitCode: 0,
      explanation: 'Viewed commit history.',
      state,
    };
  }

  if (parsed.type === 'add') {
    if (parsed.args.length === 0 && !parsed.flags['A'] && !parsed.flags['all'] && !parsed.flags['a']) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mNothing specified, nothing added.\x1b[0m',
        exitCode: 0,
        state,
      };
    }
    const files = parsed.flags['A'] || parsed.flags['all'] || parsed.flags['a'] ? ['.'] : parsed.args;
    const res = await gitBridge.send('ADD', { files });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: `Staged changes for: ${files.join(', ')}.`,
      state: res.state,
    };
  }

  if (parsed.type === 'commit') {
    let message = (parsed.flags['m'] || parsed.flags['message']) as string;
    if (!message && parsed.args.length > 0) {
      message = parsed.args.join(' ');
    }
    if (!message) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mAborting commit due to empty commit message.\x1b[0m',
        exitCode: 1,
        explanation: 'Commit aborted because no message was provided with -m.',
        state,
      };
    }

    if (state.stagedFiles.length === 0 && !parsed.flags['allow-empty']) {
      return {
        rawCommand: rawInput,
        stdout: 'On branch ' + state.head.target + '\nnothing to commit, working tree clean',
        stderr: '',
        exitCode: 1,
        explanation: 'No staged changes to commit. Use "git add" first.',
        state,
      };
    }

    const res = await gitBridge.send('COMMIT', {
      message,
      allowEmpty: Boolean(parsed.flags['allow-empty']),
    });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: `Created new commit "${message}". HEAD and branch pointer advanced.`,
      state: res.state,
    };
  }

  if (parsed.type === 'branch') {
    const isDelete = Boolean(parsed.flags['d'] || parsed.flags['delete']);
    const isForceDelete = Boolean(parsed.flags['D']);
    const branchName =
      (typeof parsed.flags['d'] === 'string'
        ? parsed.flags['d']
        : typeof parsed.flags['D'] === 'string'
        ? parsed.flags['D']
        : parsed.args[0]);

    if (isDelete || isForceDelete) {
      if (!branchName) {
        return {
          rawCommand: rawInput,
          stdout: '',
          stderr: '\x1b[31mfatal: branch name required\x1b[0m',
          exitCode: 1,
          state,
        };
      }
      const res = await gitBridge.send('BRANCH', {
        delete: isDelete ? branchName : undefined,
        forceDelete: isForceDelete ? branchName : undefined,
      });
      return {
        rawCommand: rawInput,
        stdout: res.output || '',
        stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
        exitCode: res.success ? 0 : 1,
        explanation: `Deleted branch "${branchName}".`,
        state: res.state,
      };
    }

    if (branchName) {
      const res = await gitBridge.send('BRANCH', { create: branchName });
      return {
        rawCommand: rawInput,
        stdout: res.output || '',
        stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
        exitCode: res.success ? 0 : 1,
        explanation: `Created new branch "${branchName}" pointing to current commit.`,
        state: res.state,
      };
    }

    const res = await gitBridge.send('BRANCH', { list: true });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: 0,
      explanation: 'Listed repository branches.',
      state: res.state,
    };
  }

  if (parsed.type === 'checkout' || parsed.type === 'switch') {
    const createBranch = Boolean(parsed.flags['b'] || parsed.flags['c']);
    const target =
      (typeof parsed.flags['b'] === 'string'
        ? parsed.flags['b']
        : typeof parsed.flags['c'] === 'string'
        ? parsed.flags['c']
        : parsed.args[0]);

    if (!target) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mfatal: target branch or commit required\x1b[0m',
        exitCode: 1,
        state,
      };
    }

    const res = await gitBridge.send('CHECKOUT', { target, createBranch });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: createBranch
        ? `Created and switched to branch "${target}".`
        : `Switched HEAD to "${target}".`,
      state: res.state,
    };
  }

  if (parsed.type === 'merge') {
    const theirs = parsed.args[0];
    if (!theirs) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mfatal: No branch specified to merge.\x1b[0m',
        exitCode: 1,
        state,
      };
    }

    const message = (parsed.flags['m'] || parsed.flags['message']) as string;
    const res = await gitBridge.send('MERGE', { theirs, message });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: `Merged branch "${theirs}" into active branch "${state.head.target}".`,
      state: res.state,
    };
  }

  if (parsed.type === 'rebase') {
    const upstream = parsed.args[0];
    if (!upstream) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mfatal: No upstream branch specified to rebase onto.\x1b[0m',
        exitCode: 1,
        state,
      };
    }

    const res = await gitBridge.send('REBASE', { upstream });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: `Replayed commits from "${state.head.target}" onto "${upstream}".`,
      state: res.state,
    };
  }

  if (parsed.type === 'cherry-pick') {
    const commit = parsed.args[0];
    if (!commit) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mfatal: commit SHA required for cherry-pick\x1b[0m',
        exitCode: 1,
        state,
      };
    }

    const res = await gitBridge.send('CHERRY_PICK', { commit });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: `Cherry-picked commit "${commit}" onto active branch.`,
      state: res.state,
    };
  }

  if (parsed.type === 'tag') {
    const isDelete = Boolean(parsed.flags['d'] || parsed.flags['delete']);
    const tagName =
      (typeof parsed.flags['d'] === 'string'
        ? parsed.flags['d']
        : typeof parsed.flags['a'] === 'string'
        ? parsed.flags['a']
        : parsed.args[0]);
    const targetCommit = parsed.args[1];

    if (isDelete) {
      if (!tagName) {
        return {
          rawCommand: rawInput,
          stdout: '',
          stderr: '\x1b[31mfatal: tag name required\x1b[0m',
          exitCode: 1,
          state,
        };
      }
      const res = await gitBridge.send('TAG', { delete: tagName });
      return {
        rawCommand: rawInput,
        stdout: res.output || '',
        stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
        exitCode: res.success ? 0 : 1,
        explanation: `Deleted tag "${tagName}".`,
        state: res.state,
      };
    }

    if (tagName) {
      const res = await gitBridge.send('TAG', { name: tagName, target: targetCommit });
      return {
        rawCommand: rawInput,
        stdout: res.output || '',
        stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
        exitCode: res.success ? 0 : 1,
        explanation: `Created tag "${tagName}" at ${targetCommit || 'HEAD'}.`,
        state: res.state,
      };
    }

    const res = await gitBridge.send('TAG', { list: true });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: '',
      exitCode: 0,
      explanation: 'Listed repository tags.',
      state: res.state,
    };
  }

  if (parsed.type === 'reset') {
    let mode: 'soft' | 'mixed' | 'hard' = 'mixed';
    if (parsed.flags['soft']) mode = 'soft';
    if (parsed.flags['hard']) mode = 'hard';

    let target = parsed.args[0] || 'HEAD';
    const res = await gitBridge.send('RESET', { target, mode });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: `Reset HEAD to "${target}" with --${mode} mode.`,
      state: res.state,
    };
  }

  if (parsed.type === 'revert') {
    const commit = parsed.args[0];
    if (!commit) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mfatal: commit SHA required for revert\x1b[0m',
        exitCode: 1,
        state,
      };
    }

    const res = await gitBridge.send('REVERT', { commit });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: `Created a new commit reverting changes from "${commit}".`,
      state: res.state,
    };
  }

  return {
    rawCommand: rawInput,
    stdout: '',
    stderr: `\x1b[31mUnsupported command: ${parsed.type}\x1b[0m`,
    exitCode: 1,
    state,
  };
}
