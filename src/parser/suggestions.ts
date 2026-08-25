export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j + 1] || matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

const GIT_COMMANDS = [
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

export function findClosestGitCommand(input: string): string | null {
  let closest: string | null = null;
  let minDistance = 3; // Maximum allowed distance for suggestion

  for (const cmd of GIT_COMMANDS) {
    const dist = levenshteinDistance(input.toLowerCase(), cmd);
    if (dist < minDistance) {
      minDistance = dist;
      closest = cmd;
    }
  }

  return closest;
}

export function getAutocompleteCandidates(
  currentLine: string,
  branches: string[] = [],
  files: string[] = []
): string[] {
  const trimmed = currentLine.trimStart();
  const parts = trimmed.split(/\s+/);

  // If typing first token or single sub: e.g. "git che" or "che"
  if (parts.length === 2 && parts[0] === 'git') {
    const sub = parts[1];
    const candidates: string[] = [];
    for (const cmd of GIT_COMMANDS) {
      if (cmd.startsWith(sub)) {
        candidates.push(`git ${cmd}`);
      }
    }
    return candidates;
  }

  // If typing git branch-related command: e.g. "git checkout fea", "git switch fea", "git merge fea"
  if (parts.length >= 3 && parts[0] === 'git' && ['checkout', 'switch', 'merge', 'rebase', 'branch'].includes(parts[1])) {
    const prefix = parts.slice(0, -1).join(' ');
    const lastPart = parts[parts.length - 1];
    const candidates: string[] = [];
    for (const b of branches) {
      if (b.startsWith(lastPart)) {
        candidates.push(`${prefix} ${b}`);
      }
    }
    return candidates;
  }

  // If typing file-related command: e.g. "git add app", "cat app", "touch app"
  if (parts.length >= 2 && (['add', 'rm'].includes(parts[1]) || ['cat', 'touch', 'rm'].includes(parts[0]))) {
    const prefix = parts.slice(0, -1).join(' ');
    const lastPart = parts[parts.length - 1];
    const candidates: string[] = [];
    for (const f of files) {
      if (f.startsWith(lastPart)) {
        candidates.push(`${prefix} ${f}`);
      }
    }
    return candidates;
  }

  // Fallback single word match
  const candidates: string[] = [];
  for (const cmd of GIT_COMMANDS) {
    if (cmd.startsWith(trimmed)) {
      candidates.push(cmd);
    }
  }
  return candidates;
}
