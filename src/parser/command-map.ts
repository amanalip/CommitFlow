import { parseCommand } from './command-parser';
import { findClosestGitCommand } from './suggestions';
import { formatStatusOutput, formatLogOutput, formatHelpText, formatCommandHelpText } from './output-formatter';
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
    const command = parsed.args[0];
    const focusedHelp = command ? formatCommandHelpText(command) : null;
    return {
      rawCommand: rawInput,
      stdout: command && focusedHelp ? focusedHelp : command ? '' : formatHelpText(),
      stderr: command && !focusedHelp
        ? `\x1b[31mgit: no simulated help topic for '${command}'. Run 'git --help' to see supported commands.\x1b[0m`
        : '',
      exitCode: command && !focusedHelp ? 1 : 0,
      explanation: command
        ? `Displayed usage, examples, and simulation notes for git ${command}.`
        : 'Displayed the complete CommitFlow command reference.',
      state,
    };
  }

  if (parsed.flags['help'] || parsed.flags['h']) {
    const focusedHelp = formatCommandHelpText(parsed.type);
    return {
      rawCommand: rawInput,
      stdout: focusedHelp || formatHelpText(),
      stderr: '',
      exitCode: 0,
      explanation: `Displayed usage, examples, and simulation notes for git ${parsed.type}.`,
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

  if (parsed.type === 'shell-rm') {
    if (parsed.args.length === 0) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mrm: missing operand\x1b[0m',
        exitCode: 1,
        state,
      };
    }
    for (const file of parsed.args) {
      await gitBridge.send('DELETE_FILE', { path: file });
    }
    state = gitBridge.getState();
    return {
      rawCommand: rawInput,
      stdout: '',
      stderr: '',
      exitCode: 0,
      state,
    };
  }

  if (parsed.type === 'ls') {
    const res = await gitBridge.send('LS_FILES');
    const files = (res.extra?.files as string[]) || [];
    return {
      rawCommand: rawInput,
      stdout: files.sort().join('  '),
      stderr: '',
      exitCode: 0,
      state: res.state,
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
    const isShort = Boolean(parsed.flags['s'] || parsed.flags['short']);
    return {
      rawCommand: rawInput,
      stdout: formatStatusOutput(state, isShort),
      stderr: '',
      exitCode: 0,
      explanation: 'Inspected status of the working tree and staging area.',
      state,
    };
  }

  if (parsed.type === 'log') {
    const oneline = Boolean(parsed.flags['oneline']);
    const graph = Boolean(parsed.flags['graph']);
    let limit: number | undefined = undefined;
    if (parsed.flags['n']) {
      limit = parseInt(String(parsed.flags['n']), 10);
    }
    return {
      rawCommand: rawInput,
      stdout: formatLogOutput(state.commits, oneline, graph, limit),
      stderr: '',
      exitCode: 0,
      explanation: 'Viewed commit history.',
      state,
    };
  }

  if (parsed.type === 'diff') {
    const staged = Boolean(parsed.flags['staged'] || parsed.flags['cached']);
    const res = await gitBridge.send('DIFF', { staged });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: '',
      exitCode: 0,
      explanation: staged
        ? 'Inspected differences in the staging area.'
        : 'Inspected differences in the working tree.',
      state: res.state,
    };
  }

  if (parsed.type === 'show') {
    const target = parsed.args[0] || 'HEAD';
    const res = await gitBridge.send('SHOW', { target });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: `Inspected commit object ${target}.`,
      state: res.state,
    };
  }

  if (parsed.type === 'stash') {
    const sub = parsed.args[0] || (parsed.flags['pop'] ? 'pop' : parsed.flags['list'] ? 'list' : 'push');
    const msg = parsed.args.slice(1).join(' ') || (typeof parsed.flags['m'] === 'string' ? parsed.flags['m'] : 'WIP');
    const reference = parsed.args.find((arg) => /^stash@\{\d+\}$/.test(arg));
    const res = await gitBridge.send('STASH', { subcommand: sub, message: msg, reference });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: sub === 'pop' ? 'Restored stashed changes.' : 'Stashed uncommitted changes.',
      state: res.state,
    };
  }

  if (parsed.type === 'restore') {
    const isStaged = Boolean(parsed.flags['staged']);
    const files = parsed.args;
    if (files.length === 0) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mfatal: you must specify path(s) to restore\x1b[0m',
        exitCode: 1,
        state,
      };
    }
    const res = await gitBridge.send('RESTORE', { files, staged: isStaged });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: isStaged
        ? `Unstaged changes for: ${files.join(', ')}.`
        : `Restored working tree file(s): ${files.join(', ')}.`,
      state: res.state,
    };
  }

  if (parsed.type === 'rm') {
    if (parsed.args.length === 0) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mfatal: No pathspec was given. Which files should I remove?\x1b[0m',
        exitCode: 128,
        state,
      };
    }

    const cached = Boolean(parsed.flags['cached']);
    const res = await gitBridge.send('RM', { files: parsed.args, cached });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: cached
        ? `Removed from the staging area: ${parsed.args.join(', ')}.`
        : `Removed and staged deletion for: ${parsed.args.join(', ')}.`,
      state: res.state,
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
    if (!message && !parsed.flags['amend']) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mAborting commit due to empty commit message.\x1b[0m',
        exitCode: 1,
        explanation: 'Commit aborted because no message was provided with -m.',
        state,
      };
    }

    if (parsed.flags['a'] || parsed.flags['all']) {
      const trackedChanges = state.unstagedFiles.map((file) => file.path);
      if (trackedChanges.length > 0) {
        const addRes = await gitBridge.send('ADD', { files: trackedChanges });
        if (!addRes.success) {
          return {
            rawCommand: rawInput,
            stdout: '',
            stderr: `\x1b[31m${addRes.error}\x1b[0m`,
            exitCode: 1,
            state: addRes.state,
          };
        }
        state = addRes.state;
      }
    }

    if (state.stagedFiles.length === 0 && !parsed.flags['allow-empty'] && !parsed.flags['amend']) {
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
      message: message || (state.commits.find((c) => c.isHead)?.message || 'amended commit'),
      allowEmpty: Boolean(parsed.flags['allow-empty']),
      amend: Boolean(parsed.flags['amend']),
    });
    return {
      rawCommand: rawInput,
      stdout: res.output || '',
      stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
      exitCode: res.success ? 0 : 1,
      explanation: `Created commit "${message}". HEAD and branch pointer advanced.`,
      state: res.state,
    };
  }

  if (parsed.type === 'branch') {
    const isDelete = Boolean(parsed.flags['d'] || parsed.flags['delete']);
    const isForceDelete = Boolean(parsed.flags['D']);
    let renameOld: string | undefined = undefined;
    let renameNew: string | undefined = undefined;

    if (parsed.flags['m'] || parsed.flags['M'] || parsed.flags['move']) {
      const mVal =
        typeof parsed.flags['m'] === 'string'
          ? parsed.flags['m']
          : typeof parsed.flags['M'] === 'string'
          ? parsed.flags['M']
          : undefined;

      if (mVal && parsed.args.length > 0) {
        renameOld = mVal;
        renameNew = parsed.args[0];
      } else if (mVal && parsed.args.length === 0) {
        renameNew = mVal;
      } else if (parsed.args.length >= 2) {
        renameOld = parsed.args[0];
        renameNew = parsed.args[1];
      } else if (parsed.args.length === 1) {
        renameNew = parsed.args[0];
      }
    }

    if (renameNew) {
      const res = await gitBridge.send('BRANCH', {
        rename: { oldName: renameOld, newName: renameNew },
      });
      return {
        rawCommand: rawInput,
        stdout: res.output || '',
        stderr: res.error ? `\x1b[31m${res.error}\x1b[0m` : '',
        exitCode: res.success ? 0 : 1,
        explanation: renameOld
          ? `Renamed branch "${renameOld}" to "${renameNew}".`
          : `Renamed current branch to "${renameNew}".`,
        state: res.state,
      };
    }

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
    const startPoint = parsed.args.length > (createBranch ? 0 : 1) ? parsed.args[parsed.args.length - 1] : undefined;

    if (!target) {
      return {
        rawCommand: rawInput,
        stdout: '',
        stderr: '\x1b[31mfatal: target branch or commit required\x1b[0m',
        exitCode: 1,
        state,
      };
    }

    const res = await gitBridge.send('CHECKOUT', { target, createBranch, startPoint });
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

    const target = parsed.args[0] || 'HEAD';
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
