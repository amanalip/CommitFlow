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
          matrix[i - 1][j] + 1      // deletion
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
  currentWord: string,
  branches: string[] = [],
  files: string[] = []
): string[] {
  const candidates: string[] = [];

  if (currentWord.startsWith('git ')) {
    const sub = currentWord.slice(4).trim();
    for (const cmd of GIT_COMMANDS) {
      if (cmd.startsWith(sub)) {
        candidates.push(`git ${cmd}`);
      }
    }
    return candidates;
  }

  for (const cmd of GIT_COMMANDS) {
    if (cmd.startsWith(currentWord)) {
      candidates.push(cmd);
    }
  }

  for (const b of branches) {
    if (b.startsWith(currentWord)) {
      candidates.push(b);
    }
  }

  for (const f of files) {
    if (f.startsWith(currentWord)) {
      candidates.push(f);
    }
  }

  return candidates;
}
