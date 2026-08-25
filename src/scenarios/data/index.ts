import { Scenario } from '../../model/types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'your-first-repo',
    title: 'Your First Repo',
    category: 'Basics',
    difficulty: 'Beginner',
    summary: 'Initialize a repo, stage files, and record three commits.',
    description: 'Learn the core Git workflow: initializing a repository, staging files with git add, and saving snapshots with git commit.',
    steps: [
      {
        command: 'git init',
        description: 'Initialize a new repository',
        explanation: 'Creates a new empty Git repository in the current folder.',
      },
      {
        command: 'echo "<h1>Welcome to CommitFlow</h1>" > index.html',
        description: 'Create an index.html file',
        explanation: 'Writes initial HTML markup to a new file in the working directory.',
      },
      {
        command: 'git add index.html',
        description: 'Stage index.html',
        explanation: 'Adds index.html to the staging area to prepare it for commit.',
      },
      {
        command: 'git commit -m "feat: initial landing page"',
        description: 'Commit index.html',
        explanation: 'Records the staged snapshot as the first commit on the main branch.',
      },
      {
        command: 'echo "body { font-family: sans-serif; }" > style.css',
        description: 'Create style.css',
        explanation: 'Adds a stylesheet in the working tree.',
      },
      {
        command: 'git add style.css',
        description: 'Stage style.css',
        explanation: 'Stages the new stylesheet.',
      },
      {
        command: 'git commit -m "style: add global styles"',
        description: 'Commit style.css',
        explanation: 'Records the second commit on main.',
      },
      {
        command: 'echo "console.log(\'app ready\');" > app.js',
        description: 'Create app.js',
        explanation: 'Adds JavaScript code in the working tree.',
      },
      {
        command: 'git add app.js',
        description: 'Stage app.js',
        explanation: 'Stages app.js.',
      },
      {
        command: 'git commit -m "feat: add app initialization"',
        description: 'Commit app.js',
        explanation: 'Records the third commit on main.',
      },
    ],
  },
  {
    id: 'branching-merging',
    title: 'Branching & Merging',
    category: 'Branching',
    difficulty: 'Beginner',
    summary: 'Create branches, commit on both paths, and merge back to main.',
    description: 'Understand how branches let you work on isolated features without affecting main, and how merging combines histories.',
    steps: [
      {
        command: 'git init',
        description: 'Initialize repo',
        explanation: 'Creates an empty Git repository.',
      },
      {
        command: 'echo "Initial project" > README.md',
        description: 'Create README.md',
        explanation: 'Creates a README file.',
      },
      {
        command: 'git add README.md',
        description: 'Stage README.md',
        explanation: 'Stages README.md.',
      },
      {
        command: 'git commit -m "docs: add initial readme"',
        description: 'Create root commit',
        explanation: 'Records the root commit on main.',
      },
      {
        command: 'git checkout -b feature/auth',
        description: 'Create and switch to feature branch',
        explanation: 'Creates branch feature/auth pointing to current commit and moves HEAD to it.',
      },
      {
        command: 'echo "export function login() {}" > auth.js',
        description: 'Create auth module',
        explanation: 'Adds auth.js to the working directory.',
      },
      {
        command: 'git add auth.js',
        description: 'Stage auth.js',
        explanation: 'Stages auth.js.',
      },
      {
        command: 'git commit -m "feat: add login function"',
        description: 'Commit on feature branch',
        explanation: 'Records a commit on feature/auth. HEAD moves forward on the feature lane.',
      },
      {
        command: 'git checkout main',
        description: 'Switch back to main',
        explanation: 'Switches HEAD back to main branch.',
      },
      {
        command: 'git merge feature/auth',
        description: 'Fast-forward merge',
        explanation: 'Fast-forwards main to match feature/auth since main had no diverging commits.',
      },
    ],
  },
  {
    id: 'rebasing-a-feature',
    title: 'Rebasing a Feature',
    category: 'Rebasing',
    difficulty: 'Intermediate',
    summary: 'Replay commits on top of another branch for a linear history.',
    description: 'Learn how git rebase lifts commits from one branch and reapplies them on top of the latest target branch commit.',
    steps: [
      {
        command: 'git init',
        description: 'Initialize repo',
        explanation: 'Creates empty Git repo.',
      },
      {
        command: 'echo "v1" > base.txt',
        description: 'Create base file',
        explanation: 'Creates base.txt.',
      },
      {
        command: 'git add base.txt',
        description: 'Stage base.txt',
        explanation: 'Stages base.txt.',
      },
      {
        command: 'git commit -m "chore: initial base commit"',
        description: 'Initial commit',
        explanation: 'First commit on main.',
      },
      {
        command: 'git checkout -b feature/ui',
        description: 'Create feature branch',
        explanation: 'Creates and switches to feature/ui.',
      },
      {
        command: 'echo "button component" > button.js',
        description: 'Add button component',
        explanation: 'Creates button.js.',
      },
      {
        command: 'git add button.js',
        description: 'Stage button',
        explanation: 'Stages button.js.',
      },
      {
        command: 'git commit -m "feat: create button component"',
        description: 'Commit on feature',
        explanation: 'Commits button component on feature/ui.',
      },
      {
        command: 'git checkout main',
        description: 'Switch to main',
        explanation: 'Switches HEAD to main.',
      },
      {
        command: 'echo "updated docs" >> base.txt',
        description: 'Update base on main',
        explanation: 'Modifies base.txt on main.',
      },
      {
        command: 'git add base.txt',
        description: 'Stage base update',
        explanation: 'Stages base.txt on main.',
      },
      {
        command: 'git commit -m "docs: update base documentation"',
        description: 'Commit on main',
        explanation: 'Main advances with a new commit while feature/ui was in progress.',
      },
      {
        command: 'git checkout feature/ui',
        description: 'Switch back to feature',
        explanation: 'Switches HEAD to feature/ui.',
      },
      {
        command: 'git rebase main',
        description: 'Rebase feature onto main',
        explanation: 'Replays feature commits on top of main, creating a linear history.',
      },
    ],
  },
  {
    id: 'detached-head-recovery',
    title: 'Detached HEAD Recovery',
    category: 'Recovery',
    difficulty: 'Intermediate',
    summary: 'Understand detached HEAD state and preserve commits by attaching a branch.',
    description: 'Learn what detached HEAD means when checking out a specific commit, and how to create a branch to keep commits from being lost.',
    steps: [
      {
        command: 'git init',
        description: 'Initialize repo',
        explanation: 'Creates repository.',
      },
      {
        command: 'echo "commit 1" > note.txt',
        description: 'Create note',
        explanation: 'Creates note.txt.',
      },
      {
        command: 'git add note.txt',
        description: 'Stage note',
        explanation: 'Stages note.txt.',
      },
      {
        command: 'git commit -m "feat: first version"',
        description: 'Commit version 1',
        explanation: 'Creates first commit on main.',
      },
      {
        command: 'echo "commit 2" > note.txt',
        description: 'Update note',
        explanation: 'Updates note.txt.',
      },
      {
        command: 'git add note.txt',
        description: 'Stage note update',
        explanation: 'Stages note.txt.',
      },
      {
        command: 'git commit -m "feat: second version"',
        description: 'Commit version 2',
        explanation: 'Creates second commit on main.',
      },
      {
        command: 'git checkout HEAD~1',
        description: 'Checkout past commit (detached HEAD)',
        explanation: 'HEAD points directly to the first commit SHA instead of a branch name.',
      },
      {
        command: 'echo "experimental change" > experiment.txt',
        description: 'Create experiment',
        explanation: 'Creates new experiment file in detached HEAD state.',
      },
      {
        command: 'git add experiment.txt',
        description: 'Stage experiment',
        explanation: 'Stages experiment.txt.',
      },
      {
        command: 'git commit -m "experiment: test new idea"',
        description: 'Commit in detached state',
        explanation: 'Commit created with no branch reference pointing to it.',
      },
      {
        command: 'git branch experiment-branch',
        description: 'Attach branch to save commit',
        explanation: 'Creates experiment-branch pointing to current detached commit so work is saved.',
      },
      {
        command: 'git checkout experiment-branch',
        description: 'Switch to experiment branch',
        explanation: 'Re-attaches HEAD to the new experiment-branch.',
      },
    ],
  },
  {
    id: 'cherry-picking',
    title: 'Cherry-Picking',
    category: 'Advanced',
    difficulty: 'Intermediate',
    summary: 'Selectively copy a specific commit from one branch to another.',
    description: 'Use git cherry-pick to apply the changes from an isolated commit on a feature branch directly onto main.',
    steps: [
      {
        command: 'git init',
        description: 'Initialize repo',
        explanation: 'Creates repo.',
      },
      {
        command: 'echo "core system" > core.txt',
        description: 'Create core file',
        explanation: 'Creates core.txt.',
      },
      {
        command: 'git add core.txt',
        description: 'Stage core.txt',
        explanation: 'Stages core.txt.',
      },
      {
        command: 'git commit -m "chore: setup core"',
        description: 'Commit core',
        explanation: 'Initial commit on main.',
      },
      {
        command: 'git checkout -b bugfix/hotfix',
        description: 'Create bugfix branch',
        explanation: 'Creates and switches to bugfix branch.',
      },
      {
        command: 'echo "patch 1" > patch.txt',
        description: 'Add patch',
        explanation: 'Creates patch.txt.',
      },
      {
        command: 'git add patch.txt',
        description: 'Stage patch',
        explanation: 'Stages patch.txt.',
      },
      {
        command: 'git commit -m "fix: critical security bug"',
        description: 'Commit critical fix',
        explanation: 'Fix committed on bugfix branch.',
      },
      {
        command: 'git checkout main',
        description: 'Switch to main',
        explanation: 'Switches HEAD to main.',
      },
      {
        command: 'git cherry-pick bugfix/hotfix',
        description: 'Cherry-pick fix to main',
        explanation: 'Applies the security fix commit directly onto main without merging unrelated branch history.',
      },
    ],
  },
  {
    id: 'undoing-mistakes',
    title: 'Undoing Mistakes',
    category: 'Undoing',
    difficulty: 'Advanced',
    summary: 'Compare soft, mixed, and hard resets, plus safe commit reverting.',
    description: 'Master git reset modes (--soft, --mixed, --hard) and git revert to fix errors safely.',
    steps: [
      {
        command: 'git init',
        description: 'Initialize repo',
        explanation: 'Creates repo.',
      },
      {
        command: 'echo "v1" > app.txt',
        description: 'Create app file',
        explanation: 'Creates app.txt.',
      },
      {
        command: 'git add app.txt',
        description: 'Stage app.txt',
        explanation: 'Stages app.txt.',
      },
      {
        command: 'git commit -m "feat: stable app version"',
        description: 'Stable commit',
        explanation: 'Records stable commit on main.',
      },
      {
        command: 'echo "bad code" > bug.txt',
        description: 'Introduce mistake',
        explanation: 'Creates bug.txt.',
      },
      {
        command: 'git add bug.txt',
        description: 'Stage bad file',
        explanation: 'Stages bug.txt.',
      },
      {
        command: 'git commit -m "feat: broken addition"',
        description: 'Commit mistake',
        explanation: 'Records commit containing the mistake.',
      },
      {
        command: 'git revert HEAD',
        description: 'Revert broken commit',
        explanation: 'Creates a new commit that inverts the changes of the broken commit, keeping history intact.',
      },
    ],
  },
  {
    id: 'tagging-releases',
    title: 'Tagging Releases',
    category: 'Tags',
    difficulty: 'Beginner',
    summary: 'Create and manage release tags on important commit points.',
    description: 'Learn how Git tags mark specific release points in history like v1.0.0.',
    steps: [
      {
        command: 'git init',
        description: 'Initialize repo',
        explanation: 'Creates empty repo.',
      },
      {
        command: 'echo "Release 1.0.0" > RELEASE.md',
        description: 'Create release notes',
        explanation: 'Creates RELEASE.md.',
      },
      {
        command: 'git add RELEASE.md',
        description: 'Stage release notes',
        explanation: 'Stages RELEASE.md.',
      },
      {
        command: 'git commit -m "release: prepare v1.0.0"',
        description: 'Commit release',
        explanation: 'Commit on main.',
      },
      {
        command: 'git tag v1.0.0',
        description: 'Create tag v1.0.0',
        explanation: 'Marks the current commit with the tag v1.0.0.',
      },
      {
        command: 'echo "Post-release patch" >> RELEASE.md',
        description: 'Add patch notes',
        explanation: 'Updates RELEASE.md.',
      },
      {
        command: 'git add RELEASE.md',
        description: 'Stage patch notes',
        explanation: 'Stages RELEASE.md.',
      },
      {
        command: 'git commit -m "fix: minor post release adjustment"',
        description: 'Commit patch',
        explanation: 'Main advances past v1.0.0.',
      },
      {
        command: 'git tag v1.0.1',
        description: 'Create tag v1.0.1',
        explanation: 'Creates tag v1.0.1 on the new commit.',
      },
    ],
  },
];
