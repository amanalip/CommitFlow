import { RepoState, CommitInfo } from '../model/types';

export function formatStatusOutput(state: RepoState, short = false): string {
  if (!state.initialized) {
    return '\x1b[31mfatal: not a git repository (or any of the parent directories): .git\x1b[0m';
  }

  if (short) {
    const lines: string[] = [];
    for (const f of state.stagedFiles) {
      const code = f.status === 'added' ? 'A' : f.status === 'deleted' ? 'D' : 'M';
      lines.push(`\x1b[32m${code}  ${f.path}\x1b[0m`);
    }
    for (const f of state.unstagedFiles) {
      lines.push(`\x1b[31m M ${f.path}\x1b[0m`);
    }
    for (const f of state.untrackedFiles) {
      lines.push(`\x1b[31m?? ${f}\x1b[0m`);
    }
    return lines.join('\n');
  }

  const lines: string[] = [];
  const head = state.head;

  if (head.type === 'detached') {
    lines.push(`HEAD detached at ${head.target}`);
  } else {
    lines.push(`On branch \x1b[32m${head.target}\x1b[0m`);
  }

  if (state.commits.length === 0) {
    lines.push('No commits yet\n');
  }

  if (state.stagedFiles.length > 0) {
    lines.push('Changes to be committed:');
    lines.push('  (use "git restore --staged <file>..." to unstage)');
    for (const f of state.stagedFiles) {
      lines.push(`\t\x1b[32m${f.status}:   ${f.path}\x1b[0m`);
    }
    lines.push('');
  }

  if (state.unstagedFiles.length > 0) {
    lines.push('Changes not staged for commit:');
    lines.push('  (use "git add <file>..." to update what will be committed)');
    for (const f of state.unstagedFiles) {
      lines.push(`\t\x1b[31m${f.status}:   ${f.path}\x1b[0m`);
    }
    lines.push('');
  }

  if (state.untrackedFiles.length > 0) {
    lines.push('Untracked files:');
    lines.push('  (use "git add <file>..." to include in what will be committed)');
    for (const f of state.untrackedFiles) {
      lines.push(`\t\x1b[31m${f}\x1b[0m`);
    }
    lines.push('');
  }

  if (
    state.stagedFiles.length === 0 &&
    state.unstagedFiles.length === 0 &&
    state.untrackedFiles.length === 0
  ) {
    lines.push('nothing to commit, working tree clean');
  }

  return lines.join('\n');
}

export function formatLogOutput(commits: CommitInfo[], oneline = false, graph = false, limit?: number): string {
  if (commits.length === 0) {
    return '\x1b[31mfatal: your current branch does not have any commits yet\x1b[0m';
  }

  const reversed = [...commits].reverse();
  const targetCommits = typeof limit === 'number' && limit > 0 ? reversed.slice(0, limit) : reversed;

  if (oneline) {
    return targetCommits
      .map((c) => {
        const prefix = graph ? '* ' : '';
        const refs: string[] = [];
        if (c.isHead) refs.push('\x1b[36mHEAD\x1b[0m');
        for (const b of c.branches) refs.push(`\x1b[32m${b}\x1b[0m`);
        for (const t of c.tags) refs.push(`\x1b[33mtag: ${t}\x1b[0m`);

        const refString = refs.length > 0 ? ` (\x1b[1m${refs.join(', ')}\x1b[0m)` : '';
        return `${prefix}\x1b[33m${c.shortOid}\x1b[0m${refString} ${c.message}`;
      })
      .join('\n');
  }

  return targetCommits
    .map((c) => {
      const refs: string[] = [];
      if (c.isHead) refs.push('\x1b[36mHEAD\x1b[0m');
      for (const b of c.branches) refs.push(`\x1b[32m${b}\x1b[0m`);
      for (const t of c.tags) refs.push(`\x1b[33mtag: ${t}\x1b[0m`);

      const refString = refs.length > 0 ? ` (\x1b[1m${refs.join(', ')}\x1b[0m)` : '';
      const dateStr = new Date(c.author.timestamp * 1000).toUTCString();

      const lines = [
        `\x1b[33mcommit ${c.oid}\x1b[0m${refString}`,
        `Author: ${c.author.name} <${c.author.email}>`,
        `Date:   ${dateStr}`,
        '',
        `    ${c.message}`,
        '',
      ];
      return lines.join('\n');
    })
    .join('\n');
}

interface CommandHelpEntry {
  usage: string;
  summary: string;
  examples: string[];
  note?: string;
}

const COMMAND_HELP: Record<string, CommandHelpEntry> = {
  init: { usage: 'git init [-b <branch>]', summary: 'Initialize an empty repository.', examples: ['git init', 'git init -b trunk'] },
  add: { usage: 'git add <file... | .>', summary: 'Copy working-tree changes into the staging area.', examples: ['git add README.md', 'git add .'] },
  rm: { usage: 'git rm [--cached] <file...>', summary: 'Remove tracked files, or remove them only from the index.', examples: ['git rm old.txt', 'git rm --cached local.env'] },
  commit: { usage: 'git commit [-a] [-m <message>] [--amend]', summary: 'Record the staged snapshot as a commit.', examples: ['git commit -m "feat: add search"', 'git commit -am "fix: update tracked files"', 'git commit --amend -m "docs: correct title"'] },
  branch: { usage: 'git branch [-d|-D|-m] [name]', summary: 'List, create, delete, or rename local branches.', examples: ['git branch feature/auth', 'git branch -m feature/login', 'git branch -d feature/auth'] },
  checkout: { usage: 'git checkout [-b] <branch|commit>', summary: 'Switch branches or inspect a commit in detached HEAD state.', examples: ['git checkout main', 'git checkout -b feature/ui', 'git checkout HEAD~1'] },
  switch: { usage: 'git switch [-c] <branch>', summary: 'Switch to a branch or create one.', examples: ['git switch main', 'git switch -c feature/ui'] },
  restore: { usage: 'git restore [--staged] <file...>', summary: 'Restore working files or move staged changes back to the working tree.', examples: ['git restore app.js', 'git restore --staged app.js'] },
  merge: { usage: 'git merge <branch>', summary: 'Join another branch into the current branch.', examples: ['git merge feature/auth'], note: 'CommitFlow demonstrates fast-forward and merge-commit histories. It does not simulate conflict resolution yet.' },
  rebase: { usage: 'git rebase <upstream>', summary: 'Replay current-branch commits on top of another branch.', examples: ['git rebase main'], note: 'Replayed commits intentionally receive new commit IDs.' },
  'cherry-pick': { usage: 'git cherry-pick <commit>', summary: 'Apply one commit change set onto the current branch.', examples: ['git cherry-pick feature/hotfix'], note: 'The copied change becomes a new commit with a new ID.' },
  tag: { usage: 'git tag [-d] [name] [commit]', summary: 'List, create, or delete lightweight tags.', examples: ['git tag v1.0.0', 'git tag -d v1.0.0'] },
  reset: { usage: 'git reset [--soft|--mixed|--hard] <commit>', summary: 'Move HEAD and optionally reset the index and working tree.', examples: ['git reset --soft HEAD~1', 'git reset --mixed HEAD~1', 'git reset --hard HEAD~1'], note: '--hard discards tracked working-tree changes.' },
  revert: { usage: 'git revert <commit>', summary: 'Create a new commit that reverses an earlier commit.', examples: ['git revert HEAD', 'git revert HEAD~2'], note: 'The original commit remains in history and the revert receives a new ID.' },
  stash: { usage: 'git stash [push|pop|list|clear] [-m <message>]', summary: 'Temporarily store or restore uncommitted work.', examples: ['git stash -m "WIP navigation"', 'git stash list', 'git stash pop'] },
  status: { usage: 'git status [-s|--short]', summary: 'Inspect the branch, staging area, and working tree.', examples: ['git status', 'git status --short'] },
  log: { usage: 'git log [-n N] [--oneline] [--graph]', summary: 'Read commit history from newest to oldest.', examples: ['git log', 'git log --oneline --graph', 'git log -n 3'] },
  diff: { usage: 'git diff [--staged|--cached]', summary: 'Compare working changes or staged changes.', examples: ['git diff', 'git diff --staged'] },
  show: { usage: 'git show [commit]', summary: 'Inspect commit identity, author, message, and tree metadata.', examples: ['git show', 'git show HEAD~1'] },
};

export function formatCommandHelpText(command: string): string | null {
  const entry = COMMAND_HELP[command];
  if (!entry) return null;

  return [
    `\x1b[1mgit ${command}\x1b[0m`,
    entry.summary,
    '',
    '\x1b[1mUsage\x1b[0m',
    `  \x1b[36m${entry.usage}\x1b[0m`,
    '',
    '\x1b[1mExamples\x1b[0m',
    ...entry.examples.map((example) => `  \x1b[33m${example}\x1b[0m`),
    ...(entry.note ? ['', `\x1b[1mCommitFlow note\x1b[0m`, `  ${entry.note}`] : []),
  ].join('\n');
}

export function formatHelpText(): string {
  return [
    '\x1b[1mCommitFlow - In-Browser Git Playground\x1b[0m',
    'A focused Git simulation for learning repository state and history.',
    '',
    'Supported Git Commands (simulated locally in your browser):',
    '  \x1b[36mgit init\x1b[0m                         Initialize an empty repository',
    '  \x1b[36mgit add <file... | .>\x1b[0m            Stage files for commit',
    '  \x1b[36mgit commit -m "<msg>"\x1b[0m           Record staged changes to repository',
    '  \x1b[36mgit branch [-d|-D|-m] [name]\x1b[0m    List, create, delete, or rename branches',
    '  \x1b[36mgit checkout [-b] <branch|sha>\x1b[0m  Switch branches or checkout commits',
    '  \x1b[36mgit switch [-c] <branch>\x1b[0m        Switch or create branches',
    '  \x1b[36mgit restore [--staged] <file>\x1b[0m  Restore working tree files or unstage',
    '  \x1b[36mgit merge <branch>\x1b[0m               Join development histories together',
    '  \x1b[36mgit rebase <upstream>\x1b[0m            Reapply commits on top of another branch',
    '  \x1b[36mgit cherry-pick <sha>\x1b[0m            Apply changes from existing commit',
    '  \x1b[36mgit tag [-d] [name] [sha]\x1b[0m        Create, list, or delete tags',
    '  \x1b[36mgit reset [--soft|--mixed|--hard] <sha>\x1b[0m Reset HEAD, index, or working tree',
    '  \x1b[36mgit revert <sha>\x1b[0m                 Revert an existing commit',
    '  \x1b[36mgit stash [pop|list|clear]\x1b[0m       Stash changes away in dirty working tree',
    '  \x1b[36mgit status [-s|--short]\x1b[0m          Show working tree and staging status',
    '  \x1b[36mgit log [-n N] [--oneline]\x1b[0m      Show commit history',
    '  \x1b[36mgit diff [--staged|--cached]\x1b[0m    Show differences in tree or staging area',
    '  \x1b[36mgit show <sha>\x1b[0m                   Inspect commit details and tree metadata',
    '',
    'Help:',
    '  \x1b[35mgit --help\x1b[0m                        Show this command reference',
    '  \x1b[35mgit help <command>\x1b[0m                Show usage, examples, and simulation notes',
    '  \x1b[35mgit <command> --help\x1b[0m             Show focused command help',
    '',
    'Filesystem & Utility Commands:',
    '  \x1b[33mtouch <file>\x1b[0m                     Create an empty file',
    '  \x1b[33mecho "text" > <file>\x1b[0m             Write text to a file',
    '  \x1b[33mecho "text" >> <file>\x1b[0m            Append text to a file',
    '  \x1b[33mcat <file>\x1b[0m                       Print file contents',
    '  \x1b[33mls\x1b[0m                               List files in working directory',
    '  \x1b[33mrm <file>\x1b[0m                        Remove a file',
    '  \x1b[33mclear\x1b[0m                            Clear terminal screen',
  ].join('\n');
}
