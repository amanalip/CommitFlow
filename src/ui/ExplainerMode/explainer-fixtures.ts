export type ExplainerDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type ExplainerKind = 'Inspect' | 'Change';

export interface ExplainerPreset {
  id: string;
  title: string;
  command: string;
  category: string;
  difficulty: ExplainerDifficulty;
  kind: ExplainerKind;
  summary: string;
  whenToUse: string;
  caution: string;
  reads: string[];
  changes: string[];
  concepts: string[];
  setupCommands: string[];
}

const INITIAL_COMMIT = [
  'git init',
  'echo "<h1>Base App</h1>" > index.html',
  'git add index.html',
  'git commit -m "feat: initial commit"',
];

const TWO_COMMITS = [
  ...INITIAL_COMMIT,
  'echo "body { margin: 0; }" > styles.css',
  'git add styles.css',
  'git commit -m "style: add base styles"',
];

const TRACKED_APP = [
  ...INITIAL_COMMIT,
  'echo "export const app = true;" > app.js',
  'git add app.js',
  'git commit -m "feat: add app module"',
];

const DIVERGED_FEATURE = [
  ...INITIAL_COMMIT,
  'git checkout -b feature/auth',
  'echo "export function login() {}" > auth.js',
  'git add auth.js',
  'git commit -m "feat: implement login"',
  'git checkout main',
  'echo "Project documentation" > README.md',
  'git add README.md',
  'git commit -m "docs: add project readme"',
];

const preset = (value: ExplainerPreset) => value;

export const EXPLAINER_PRESETS: ExplainerPreset[] = [
  preset({
    id: 'init', title: 'Initialize a repository', command: 'git init', category: 'Repository basics', difficulty: 'Beginner', kind: 'Change',
    summary: 'Create the hidden Git repository data that makes version tracking possible.',
    whenToUse: 'Run this once at the root of a new project before using other Git commands.',
    caution: 'Running it again does not erase commits, but initializing the wrong folder creates a separate repository.',
    reads: ['Current directory'], changes: ['Repository metadata', 'Default branch name'], concepts: ['repository', '.git directory', 'default branch'], setupCommands: [],
  }),
  preset({
    id: 'status-short', title: 'Read concise repository status', command: 'git status --short', category: 'Inspect', difficulty: 'Beginner', kind: 'Inspect',
    summary: 'Summarize staged, unstaged, and untracked paths using two status columns.',
    whenToUse: 'Use it before staging or committing to check exactly what Git sees.',
    caution: 'The first column describes the index and the second describes the working tree.',
    reads: ['HEAD', 'Staging area', 'Working tree'], changes: ['Nothing'], concepts: ['status codes', 'index', 'working tree'],
    setupCommands: [...TRACKED_APP, 'echo "export const app = false;" > app.js', 'touch notes.txt'],
  }),
  preset({
    id: 'log-graph', title: 'Read the branch graph', command: 'git log --oneline --graph', category: 'Inspect', difficulty: 'Beginner', kind: 'Inspect',
    summary: 'Display compact commit history with text lines that reveal branching and merging.',
    whenToUse: 'Use it to orient yourself before merging, rebasing, reverting, or resetting.',
    caution: 'This is read-only. The newest reachable commit is shown first.',
    reads: ['Commit graph', 'Branch refs', 'HEAD'], changes: ['Nothing'], concepts: ['history', 'parent links', 'reachability'], setupCommands: DIVERGED_FEATURE,
  }),
  preset({
    id: 'diff-working', title: 'Inspect unstaged edits', command: 'git diff', category: 'Inspect', difficulty: 'Beginner', kind: 'Inspect',
    summary: 'Compare the working tree with the staging area.',
    whenToUse: 'Use it before staging to review edits that are not in the next commit yet.',
    caution: 'It does not show already staged changes. Use `git diff --staged` for those.',
    reads: ['Working tree', 'Staging area'], changes: ['Nothing'], concepts: ['patch', 'unstaged change', 'working tree'],
    setupCommands: [...TRACKED_APP, 'echo "export const app = false;" > app.js'],
  }),
  preset({
    id: 'diff-staged', title: 'Inspect the proposed commit', command: 'git diff --staged', category: 'Inspect', difficulty: 'Beginner', kind: 'Inspect',
    summary: 'Compare the staging area with HEAD to review the exact staged patch.',
    whenToUse: 'Run it immediately before committing as a final content check.',
    caution: 'Unstaged edits are excluded even if they are in the same file.',
    reads: ['HEAD tree', 'Staging area'], changes: ['Nothing'], concepts: ['index', 'staged patch', 'commit boundary'],
    setupCommands: [...TRACKED_APP, 'echo "export const app = false;" > app.js', 'git add app.js'],
  }),
  preset({
    id: 'show-head', title: 'Inspect the current commit', command: 'git show HEAD', category: 'Inspect', difficulty: 'Beginner', kind: 'Inspect',
    summary: 'Show metadata and the patch recorded by the commit at HEAD.',
    whenToUse: 'Use it to understand the newest commit without changing repository state.',
    caution: 'A revision such as a branch, tag, or SHA can replace HEAD.',
    reads: ['HEAD', 'Commit object', 'Commit tree'], changes: ['Nothing'], concepts: ['commit object', 'revision', 'patch'], setupCommands: TWO_COMMITS,
  }),
  preset({
    id: 'add-file', title: 'Stage one file', command: 'git add app.js', category: 'Staging and files', difficulty: 'Beginner', kind: 'Change',
    summary: 'Copy the current content of one file into the staging area.',
    whenToUse: 'Use it when this file belongs in the next commit.',
    caution: 'Later edits to the same file remain unstaged until you add it again.',
    reads: ['Working tree file'], changes: ['Staging area'], concepts: ['index', 'snapshot', 'pathspec'],
    setupCommands: [...INITIAL_COMMIT, 'echo "export const app = true;" > app.js'],
  }),
  preset({
    id: 'restore-staged', title: 'Unstage without losing work', command: 'git restore --staged app.js', category: 'Staging and files', difficulty: 'Beginner', kind: 'Change',
    summary: 'Remove a file from the proposed commit while preserving its working-tree content.',
    whenToUse: 'Use it when a file was staged too early or belongs in another commit.',
    caution: 'The edit remains in the working tree and can be staged again later.',
    reads: ['HEAD tree'], changes: ['Staging area'], concepts: ['unstage', 'index', 'working tree safety'],
    setupCommands: [...TRACKED_APP, 'echo "export const app = false;" > app.js', 'git add app.js'],
  }),
  preset({
    id: 'restore-file', title: 'Discard an unstaged edit', command: 'git restore app.js', category: 'Staging and files', difficulty: 'Beginner', kind: 'Change',
    summary: 'Replace the working copy with the version currently held in the staging area.',
    whenToUse: 'Use it only when you are sure an unstaged edit is no longer needed.',
    caution: 'The discarded working-tree content is not saved by Git.',
    reads: ['Staging area'], changes: ['Working tree file'], concepts: ['discard', 'restore source', 'working tree'],
    setupCommands: [...TRACKED_APP, 'echo "temporary broken edit" > app.js'],
  }),
  preset({
    id: 'rm-file', title: 'Delete and stage the deletion', command: 'git rm old.txt', category: 'Staging and files', difficulty: 'Beginner', kind: 'Change',
    summary: 'Remove a tracked file from disk and stage that removal together.',
    whenToUse: 'Use it when a tracked file should be deleted in the next commit.',
    caution: 'The file leaves the working tree immediately, though the deletion is not permanent until committed.',
    reads: ['Tracked file'], changes: ['Working tree', 'Staging area'], concepts: ['tracked deletion', 'index', 'next commit'],
    setupCommands: [...INITIAL_COMMIT, 'echo "legacy" > old.txt', 'git add old.txt', 'git commit -m "chore: add legacy file"'],
  }),
  preset({
    id: 'rm-cached', title: 'Stop tracking but keep the file', command: 'git rm --cached config.local', category: 'Staging and files', difficulty: 'Intermediate', kind: 'Change',
    summary: 'Stage a tracked-file removal while leaving the local file on disk.',
    whenToUse: 'Use it after accidentally committing a local configuration file that should remain on your machine.',
    caution: 'Add the path to `.gitignore` separately or Git will show it as untracked.',
    reads: ['Tracked file'], changes: ['Staging area', 'Tracking status'], concepts: ['untrack', 'cached removal', 'ignore rules'],
    setupCommands: [...INITIAL_COMMIT, 'echo "PORT=3000" > config.local', 'git add config.local', 'git commit -m "chore: add local config"'],
  }),
  preset({
    id: 'commit', title: 'Create a commit', command: 'git commit -m "feat: implement login"', category: 'Commits', difficulty: 'Beginner', kind: 'Change',
    summary: 'Write the staged snapshot as a new commit and advance the current branch.',
    whenToUse: 'Use it when the staging area contains one coherent, reviewed change.',
    caution: 'Unstaged and untracked content is excluded from the new commit.',
    reads: ['Staging area', 'Current HEAD'], changes: ['Commit graph', 'Current branch', 'HEAD'], concepts: ['snapshot', 'commit message', 'parent commit'],
    setupCommands: [...TWO_COMMITS, 'echo "export function login() {}" > auth.js', 'git add auth.js'],
  }),
  preset({
    id: 'amend', title: 'Replace the latest commit', command: 'git commit --amend -m "style: polish base styles"', category: 'Commits', difficulty: 'Intermediate', kind: 'Change',
    summary: 'Create a replacement for HEAD using the current index and a corrected message.',
    whenToUse: 'Use it to fix your newest local commit before sharing it.',
    caution: 'The replacement receives a new commit ID. Avoid amending commits others already use.',
    reads: ['HEAD', 'Staging area'], changes: ['Commit graph', 'Current branch', 'HEAD'], concepts: ['history rewrite', 'new object ID', 'amend'], setupCommands: TWO_COMMITS,
  }),
  preset({
    id: 'branch-create', title: 'Create a branch pointer', command: 'git branch feature/ui', category: 'Branches', difficulty: 'Beginner', kind: 'Change',
    summary: 'Create a named pointer at the current commit without switching to it.',
    whenToUse: 'Use it when you want to mark a starting point before moving elsewhere.',
    caution: 'HEAD stays on the current branch. Use checkout or switch to begin work there.',
    reads: ['HEAD commit'], changes: ['Branch refs'], concepts: ['branch pointer', 'HEAD', 'ref'], setupCommands: TWO_COMMITS,
  }),
  preset({
    id: 'checkout-create', title: 'Create and switch branches', command: 'git checkout -b feature/auth', category: 'Branches', difficulty: 'Beginner', kind: 'Change',
    summary: 'Create a branch at HEAD and immediately attach HEAD to it.',
    whenToUse: 'Use it to start isolated work from the current commit.',
    caution: 'Uncommitted changes move with you when Git can apply them safely.',
    reads: ['Current HEAD', 'Working tree'], changes: ['Branch refs', 'HEAD', 'Working tree'], concepts: ['branch creation', 'checkout', 'attached HEAD'], setupCommands: TWO_COMMITS,
  }),
  preset({
    id: 'switch', title: 'Switch to an existing branch', command: 'git switch feature/ui', category: 'Branches', difficulty: 'Beginner', kind: 'Change',
    summary: 'Move HEAD to an existing branch and restore that branch snapshot.',
    whenToUse: 'Use it when changing the line of development you are working on.',
    caution: 'Commit or stash conflicting local edits before switching.',
    reads: ['Target branch', 'Commit tree'], changes: ['HEAD', 'Working tree'], concepts: ['switch', 'branch snapshot', 'attached HEAD'],
    setupCommands: [...TWO_COMMITS, 'git branch feature/ui'],
  }),
  preset({
    id: 'merge', title: 'Merge divergent work', command: 'git merge feature/auth', category: 'Branches', difficulty: 'Intermediate', kind: 'Change',
    summary: 'Combine the feature branch with main and record both parents in a merge commit.',
    whenToUse: 'Use it when the branch history should preserve the fact that two lines of work came together.',
    caution: 'Real repositories can produce conflicts that must be resolved before the merge completes.',
    reads: ['Current branch', 'Feature branch', 'Both commit trees'], changes: ['Commit graph', 'Current branch', 'HEAD', 'Working tree'], concepts: ['merge commit', 'two parents', 'divergence'], setupCommands: DIVERGED_FEATURE,
  }),
  preset({
    id: 'rebase', title: 'Replay work onto a new base', command: 'git rebase main', category: 'History editing', difficulty: 'Advanced', kind: 'Change',
    summary: 'Recreate feature commits after the latest main commit for a linear history.',
    whenToUse: 'Use it to update private feature work before integration.',
    caution: 'Replayed commits get new IDs. Do not casually rebase shared history.',
    reads: ['Feature commits', 'Upstream branch', 'Commit trees'], changes: ['Commit graph', 'Current branch', 'HEAD'], concepts: ['replay', 'new object IDs', 'linear history'],
    setupCommands: [...DIVERGED_FEATURE, 'git checkout feature/auth'],
  }),
  preset({
    id: 'cherry-pick', title: 'Copy one selected change', command: 'git cherry-pick feature/hotfix', category: 'History editing', difficulty: 'Advanced', kind: 'Change',
    summary: 'Apply one branch tip as a new commit on the current branch.',
    whenToUse: 'Use it to move a focused fix without merging unrelated branch work.',
    caution: 'The copied commit has a new ID and may conflict with current files.',
    reads: ['Selected commit', 'Current HEAD'], changes: ['Commit graph', 'Current branch', 'HEAD', 'Working tree'], concepts: ['selective integration', 'new object ID', 'patch application'],
    setupCommands: [...INITIAL_COMMIT, 'git checkout -b feature/hotfix', 'echo "critical fix" > hotfix.txt', 'git add hotfix.txt', 'git commit -m "fix: critical issue"', 'git checkout main'],
  }),
  preset({
    id: 'revert', title: 'Undo with a new commit', command: 'git revert HEAD', category: 'Recovery', difficulty: 'Intermediate', kind: 'Change',
    summary: 'Apply the inverse of HEAD and record that undo as a new commit.',
    whenToUse: 'Use it to safely undo a shared commit while preserving the audit trail.',
    caution: 'The original commit remains in history. Revert can conflict with later edits.',
    reads: ['Selected commit', 'Current tree'], changes: ['Commit graph', 'Current branch', 'HEAD', 'Working tree'], concepts: ['inverse patch', 'safe undo', 'audit trail'], setupCommands: TWO_COMMITS,
  }),
  preset({
    id: 'reset-soft', title: 'Move HEAD and keep changes staged', command: 'git reset --soft HEAD~1', category: 'Recovery', difficulty: 'Advanced', kind: 'Change',
    summary: 'Move the branch back one commit while keeping that commit content in the staging area.',
    whenToUse: 'Use it to rebuild the newest local commit without restaging its files.',
    caution: 'This rewrites the branch tip. Avoid it on shared history.',
    reads: ['Target revision', 'Current commit'], changes: ['Current branch', 'HEAD', 'Staging area'], concepts: ['soft reset', 'history rewrite', 'index preserved'], setupCommands: TWO_COMMITS,
  }),
  preset({
    id: 'reset-mixed', title: 'Move HEAD and unstage changes', command: 'git reset HEAD~1', category: 'Recovery', difficulty: 'Advanced', kind: 'Change',
    summary: 'Move the branch back one commit, reset the index, and keep the file edits in the working tree.',
    whenToUse: 'Use it to dismantle a local commit and choose a different staging split.',
    caution: 'This rewrites the branch tip, though file content remains available locally.',
    reads: ['Target revision', 'Current commit'], changes: ['Current branch', 'HEAD', 'Staging area', 'Working tree status'], concepts: ['mixed reset', 'unstage', 'history rewrite'], setupCommands: TWO_COMMITS,
  }),
  preset({
    id: 'reset-hard', title: 'Move HEAD and discard local state', command: 'git reset --hard HEAD~1', category: 'Recovery', difficulty: 'Advanced', kind: 'Change',
    summary: 'Move the branch back and make both the index and working tree match the target commit.',
    whenToUse: 'Use it only when the removed commit and local edits are definitely unwanted.',
    caution: 'This discards tracked local work and rewrites the branch tip.',
    reads: ['Target revision'], changes: ['Current branch', 'HEAD', 'Staging area', 'Working tree'], concepts: ['hard reset', 'destructive recovery', 'target tree'], setupCommands: TWO_COMMITS,
  }),
  preset({
    id: 'stash-push', title: 'Temporarily shelve tracked edits', command: 'git stash push -m "pause work"', category: 'Stash and release', difficulty: 'Intermediate', kind: 'Change',
    summary: 'Save uncommitted tracked changes in the stash and return to a clean working tree.',
    whenToUse: 'Use it when you must switch context before unfinished work is ready to commit.',
    caution: 'Untracked files are not included by this simulator.',
    reads: ['Staging area', 'Working tree'], changes: ['Stash list', 'Staging area', 'Working tree'], concepts: ['temporary shelf', 'clean tree', 'stash entry'],
    setupCommands: [...TRACKED_APP, 'echo "unfinished edit" > app.js'],
  }),
  preset({
    id: 'stash-pop', title: 'Restore the latest stash', command: 'git stash pop', category: 'Stash and release', difficulty: 'Intermediate', kind: 'Change',
    summary: 'Reapply the newest stash to the working tree and remove that stash entry.',
    whenToUse: 'Use it when you are ready to resume the most recently shelved work.',
    caution: 'Applying a stash can conflict with newer edits.',
    reads: ['Latest stash', 'Current working tree'], changes: ['Stash list', 'Working tree'], concepts: ['restore work', 'stash stack', 'pop'],
    setupCommands: [...TRACKED_APP, 'echo "unfinished edit" > app.js', 'git stash push -m "pause work"'],
  }),
  preset({
    id: 'tag-create', title: 'Mark a release commit', command: 'git tag v1.0.0', category: 'Stash and release', difficulty: 'Beginner', kind: 'Change',
    summary: 'Create a stable release name that points at the current commit.',
    whenToUse: 'Use it to mark a version that may be built, deployed, or referenced later.',
    caution: 'A lightweight tag is only a ref. Share it separately in a real remote workflow.',
    reads: ['HEAD commit'], changes: ['Tag refs'], concepts: ['tag', 'release marker', 'stable ref'], setupCommands: TWO_COMMITS,
  }),
  preset({
    id: 'tag-delete', title: 'Remove a local tag', command: 'git tag -d v1.0.0', category: 'Stash and release', difficulty: 'Intermediate', kind: 'Change',
    summary: 'Delete the local release name without deleting the commit it referenced.',
    whenToUse: 'Use it when a local tag was created at the wrong commit or with the wrong name.',
    caution: 'Deleting a remote tag is a separate operation in real Git.',
    reads: ['Tag ref'], changes: ['Tag refs'], concepts: ['ref deletion', 'commit reachability', 'local tag'], setupCommands: [...TWO_COMMITS, 'git tag v1.0.0'],
  }),
];

export function findExplainerPreset(command: string): ExplainerPreset | undefined {
  const normalized = command.trim().replace(/\s+/g, ' ');
  return EXPLAINER_PRESETS.find((item) => item.command === normalized);
}

export function getExplainerSetup(command: string): string[] {
  return findExplainerPreset(command)?.setupCommands ?? TWO_COMMITS;
}
