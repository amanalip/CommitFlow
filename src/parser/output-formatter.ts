import { RepoState, CommitInfo } from '../model/types';

export function formatStatusOutput(state: RepoState, short = false): string {
  if (!state.initialized) {
    return '\x1b[31mfatal: not a git repository (or any of the parent directories): .git\x1b[0m';
  }

  if (short) {
    const lines: string[] = [];
    for (const f of state.stagedFiles) {
      lines.push(`\x1b[32mM  ${f.path}\x1b[0m`);
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
        `Date:   ${dateStr}`,
        '',
        `    ${c.message}`,
        '',
      ];
      return lines.join('\n');
    })
    .join('\n');
}

export function formatHelpText(): string {
  return [
    '\x1b[1mCommitFlow - In-Browser Git Playground\x1b[0m',
    '',
    'Supported Git Commands:',
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
    '  \x1b[36mgit reset [--soft|--hard] <sha>\x1b[0m Reset current HEAD to specified state',
    '  \x1b[36mgit revert <sha>\x1b[0m                 Revert an existing commit',
    '  \x1b[36mgit stash [pop|list|clear]\x1b[0m       Stash changes away in dirty working tree',
    '  \x1b[36mgit status [-s|--short]\x1b[0m          Show working tree and staging status',
    '  \x1b[36mgit log [-n N] [--oneline]\x1b[0m      Show commit history',
    '  \x1b[36mgit diff [--staged|--cached]\x1b[0m    Show differences in tree or staging area',
    '  \x1b[36mgit show <sha>\x1b[0m                   Inspect commit details and tree metadata',
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
