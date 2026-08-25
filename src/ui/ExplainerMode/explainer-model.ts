import { RepoState } from '../../model/types';

export interface StateComparisonRow {
  key: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
  help: string;
}

export interface ExplainerChange {
  kind: 'added' | 'removed' | 'moved' | 'changed' | 'unchanged';
  title: string;
  detail: string;
}

export interface CommandToken {
  text: string;
  role: 'program' | 'command' | 'option' | 'revision' | 'argument';
}

const short = (oid?: string) => oid ? oid.slice(0, 7) : 'none';
const list = (values: string[]) => values.length ? values.join(', ') : 'None';
const files = (state: RepoState, key: 'stagedFiles' | 'unstagedFiles') => state[key].map((file) => `${file.path} (${file.status})`);

export function compareRepoStates(before: RepoState, after: RepoState): StateComparisonRow[] {
  const values: Array<[string, string, string, string, string]> = [
    ['repository', 'Repository', before.initialized ? 'Initialized' : 'Not initialized', after.initialized ? 'Initialized' : 'Not initialized', 'Whether this folder contains Git repository metadata.'],
    ['head', 'HEAD', before.initialized ? `${before.head.type}: ${before.head.target} @ ${short(before.head.oid)}` : 'Unavailable', after.initialized ? `${after.head.type}: ${after.head.target} @ ${short(after.head.oid)}` : 'Unavailable', 'HEAD identifies the branch or commit currently checked out.'],
    ['commits', 'Commits', String(before.commits.length), String(after.commits.length), 'The number of reachable commit objects shown in this simulation.'],
    ['branches', 'Branches', list(before.branches.map((branch) => `${branch.name} @ ${short(branch.oid)}`)), list(after.branches.map((branch) => `${branch.name} @ ${short(branch.oid)}`)), 'Branch names are movable refs that point to commits.'],
    ['tags', 'Tags', list(before.tags.map((tag) => `${tag.name} @ ${short(tag.oid)}`)), list(after.tags.map((tag) => `${tag.name} @ ${short(tag.oid)}`)), 'Tags are stable names commonly used for releases.'],
    ['staged', 'Staged files', list(files(before, 'stagedFiles')), list(files(after, 'stagedFiles')), 'The staging area is the proposed content of the next commit.'],
    ['unstaged', 'Unstaged files', list(files(before, 'unstagedFiles')), list(files(after, 'unstagedFiles')), 'Tracked working-tree edits that are not staged.'],
    ['untracked', 'Untracked files', list(before.untrackedFiles), list(after.untrackedFiles), 'Files Git sees but does not track yet.'],
    ['stashes', 'Stashes', list(before.stashes.map((stash) => `stash@{${stash.index}} ${stash.message}`)), list(after.stashes.map((stash) => `stash@{${stash.index}} ${stash.message}`)), 'Saved work kept outside the active working tree.'],
  ];
  return values.map(([key, label, beforeValue, afterValue, help]) => ({ key, label, before: beforeValue, after: afterValue, changed: beforeValue !== afterValue, help }));
}

export function describeRepoChanges(before: RepoState, after: RepoState): ExplainerChange[] {
  const changes: ExplainerChange[] = [];
  if (before.initialized !== after.initialized) {
    changes.push({ kind: 'added', title: 'Repository initialized', detail: `Git metadata now exists and HEAD targets ${after.head.target}.` });
  }

  const beforeCommits = new Map(before.commits.map((commit) => [commit.oid, commit]));
  const afterCommits = new Map(after.commits.map((commit) => [commit.oid, commit]));
  for (const commit of after.commits) {
    if (!beforeCommits.has(commit.oid)) changes.push({ kind: 'added', title: `Commit created ${commit.shortOid}`, detail: commit.message });
  }
  for (const commit of before.commits) {
    if (!afterCommits.has(commit.oid)) changes.push({ kind: 'removed', title: `Commit no longer reachable ${commit.shortOid}`, detail: commit.message });
  }

  const beforeBranches = new Map(before.branches.map((branch) => [branch.name, branch.oid]));
  const afterBranches = new Map(after.branches.map((branch) => [branch.name, branch.oid]));
  for (const branch of after.branches) {
    if (!beforeBranches.has(branch.name)) changes.push({ kind: 'added', title: `Branch added ${branch.name}`, detail: `Points to ${short(branch.oid)}.` });
    else if (beforeBranches.get(branch.name) !== branch.oid) changes.push({ kind: 'moved', title: `Branch moved ${branch.name}`, detail: `${short(beforeBranches.get(branch.name))} to ${short(branch.oid)}.` });
  }
  for (const branch of before.branches) {
    if (!afterBranches.has(branch.name)) changes.push({ kind: 'removed', title: `Branch removed ${branch.name}`, detail: `Its commits remain if another ref can reach them.` });
  }

  const beforeTags = new Set(before.tags.map((tag) => tag.name));
  const afterTags = new Set(after.tags.map((tag) => tag.name));
  for (const tag of afterTags) if (!beforeTags.has(tag)) changes.push({ kind: 'added', title: `Tag added ${tag}`, detail: 'A new stable name points to a commit.' });
  for (const tag of beforeTags) if (!afterTags.has(tag)) changes.push({ kind: 'removed', title: `Tag removed ${tag}`, detail: 'The commit itself was not deleted.' });

  const fileRows = compareRepoStates(before, after).filter((row) => ['staged', 'unstaged', 'untracked', 'stashes'].includes(row.key) && row.changed);
  for (const row of fileRows) changes.push({ kind: 'changed', title: `${row.label} changed`, detail: `${row.before} to ${row.after}.` });

  if (before.head.target !== after.head.target || before.head.oid !== after.head.oid || before.head.type !== after.head.type) {
    changes.push({ kind: 'moved', title: 'HEAD changed', detail: `${before.head.target} @ ${short(before.head.oid)} to ${after.head.target} @ ${short(after.head.oid)}.` });
  }

  if (changes.length === 0) {
    changes.push({ kind: 'unchanged', title: 'Repository state did not change', detail: 'This command only inspected repository data. Its useful result is shown in Command output.' });
  }
  return changes;
}

export function tokenizeExplainerCommand(command: string): CommandToken[] {
  const tokens = command.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  return tokens.map((text, index) => {
    if (index === 0) return { text, role: 'program' };
    if (index === 1) return { text, role: 'command' };
    if (text.startsWith('-')) return { text, role: 'option' };
    if (/^(HEAD|[A-Za-z0-9._/-]+[~^]\d*|[0-9a-f]{7,40})$/.test(text)) return { text, role: 'revision' };
    return { text, role: 'argument' };
  });
}
