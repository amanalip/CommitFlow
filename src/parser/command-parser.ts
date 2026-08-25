import { ParsedCommand, GitCommandType } from '../model/types';

export function tokenizeCommandLine(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let escape = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escape) {
      current += char;
      escape = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      escape = true;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (/\s/.test(char) && !inDoubleQuote && !inSingleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

export function parseCommand(rawInput: string): ParsedCommand {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      raw: rawInput,
      type: 'unknown',
      args: [],
      flags: {},
    };
  }

  // Check for shell redirects like: echo "text" > file or echo "text" >> file
  const redirectMatch = trimmed.match(/^(echo\s+.*?)\s*(>>|>)\s*([^\s]+)$/);
  if (redirectMatch) {
    const echoPart = redirectMatch[1];
    const isAppend = redirectMatch[2] === '>>';
    const targetFile = redirectMatch[3];
    const echoTokens = tokenizeCommandLine(echoPart);
    const content = echoTokens.slice(1).join(' ');

    return {
      raw: rawInput,
      type: 'echo',
      args: [targetFile],
      flags: {},
      targetFile,
      fileContent: content + '\n',
      append: isAppend,
    };
  }

  const tokens = tokenizeCommandLine(trimmed);
  const firstToken = tokens[0];

  if (firstToken === 'touch') {
    return {
      raw: rawInput,
      type: 'touch',
      args: tokens.slice(1),
      flags: {},
    };
  }

  if (firstToken === 'cat') {
    return {
      raw: rawInput,
      type: 'cat',
      args: tokens.slice(1),
      flags: {},
    };
  }

  if (firstToken === 'ls') {
    return {
      raw: rawInput,
      type: 'ls',
      args: tokens.slice(1),
      flags: {},
    };
  }

  if (firstToken === 'rm') {
    return {
      raw: rawInput,
      type: 'rm',
      args: tokens.slice(1),
      flags: {},
    };
  }

  if (firstToken === 'clear') {
    return {
      raw: rawInput,
      type: 'clear',
      args: [],
      flags: {},
    };
  }

  if (firstToken === 'help') {
    return {
      raw: rawInput,
      type: 'help',
      args: [],
      flags: {},
    };
  }

  if (firstToken !== 'git') {
    return {
      raw: rawInput,
      type: 'unknown',
      args: tokens,
      flags: {},
      error: `command not found: ${firstToken}`,
    };
  }

  if (tokens.length === 1) {
    return {
      raw: rawInput,
      type: 'help',
      args: [],
      flags: {},
    };
  }

  const subcommand = tokens[1];
  const rest = tokens.slice(2);
  const flags: Record<string, string | boolean | string[]> = {};
  const positionalArgs: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];

    if (token.startsWith('--')) {
      const eqIndex = token.indexOf('=');
      if (eqIndex !== -1) {
        const flagName = token.slice(2, eqIndex);
        const flagVal = token.slice(eqIndex + 1);
        flags[flagName] = flagVal;
      } else {
        const flagName = token.slice(2);
        if (i + 1 < rest.length && !rest[i + 1].startsWith('-') && !['soft', 'mixed', 'hard', 'all', 'oneline', 'graph', 'cached', 'tags'].includes(flagName)) {
          flags[flagName] = rest[i + 1];
          i++;
        } else {
          flags[flagName] = true;
        }
      }
    } else if (token.startsWith('-') && token.length > 1) {
      const flagName = token.slice(1);
      if (flagName === 'm' && i + 1 < rest.length) {
        flags['m'] = rest[i + 1];
        i++;
      } else if (flagName === 'b' && i + 1 < rest.length) {
        flags['b'] = rest[i + 1];
        i++;
      } else if (flagName === 'a' && i + 1 < rest.length && !rest[i + 1].startsWith('-') && subcommand === 'tag') {
        flags['a'] = rest[i + 1];
        i++;
      } else if (flagName === 'd' && i + 1 < rest.length) {
        flags['d'] = rest[i + 1];
        i++;
      } else if (flagName === 'D' && i + 1 < rest.length) {
        flags['D'] = rest[i + 1];
        i++;
      } else {
        // Individual char flags or combined flags
        for (const char of flagName) {
          flags[char] = true;
        }
      }
    } else {
      positionalArgs.push(token);
    }
  }

  const validCommands: GitCommandType[] = [
    'init',
    'add',
    'rm',
    'commit',
    'branch',
    'checkout',
    'switch',
    'merge',
    'rebase',
    'cherry-pick',
    'log',
    'status',
    'diff',
    'show',
    'tag',
    'reset',
    'revert',
    'stash',
  ];

  if (!validCommands.includes(subcommand as GitCommandType)) {
    return {
      raw: rawInput,
      type: 'unknown',
      args: tokens.slice(1),
      flags,
      error: `git: '${subcommand}' is not a git command.`,
    };
  }

  return {
    raw: rawInput,
    type: subcommand as GitCommandType,
    args: positionalArgs,
    flags,
  };
}
