export interface ExplainerPreset {
  command: string;
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

export const EXPLAINER_PRESETS: ExplainerPreset[] = [
  {
    command: 'git checkout -b feature/auth',
    setupCommands: TWO_COMMITS,
  },
  {
    command: 'git commit -m "feat: implement login"',
    setupCommands: [
      ...TWO_COMMITS,
      'echo "export function login() {}" > auth.js',
      'git add auth.js',
    ],
  },
  {
    command: 'git merge feature/auth',
    setupCommands: [
      ...INITIAL_COMMIT,
      'git checkout -b feature/auth',
      'echo "export function login() {}" > auth.js',
      'git add auth.js',
      'git commit -m "feat: implement login"',
      'git checkout main',
      'echo "Project documentation" > README.md',
      'git add README.md',
      'git commit -m "docs: add project readme"',
    ],
  },
  {
    command: 'git rebase main',
    setupCommands: [
      ...INITIAL_COMMIT,
      'git checkout -b feature/ui',
      'echo "export const Button = () => null;" > button.js',
      'git add button.js',
      'git commit -m "feat: add button component"',
      'git checkout main',
      'echo "Project documentation" > README.md',
      'git add README.md',
      'git commit -m "docs: add project readme"',
      'git checkout feature/ui',
    ],
  },
  {
    command: 'git reset --soft HEAD~1',
    setupCommands: TWO_COMMITS,
  },
  {
    command: 'git revert HEAD',
    setupCommands: TWO_COMMITS,
  },
  {
    command: 'git tag v1.0.0',
    setupCommands: TWO_COMMITS,
  },
];

export function getExplainerSetup(command: string): string[] {
  return EXPLAINER_PRESETS.find((preset) => preset.command === command)?.setupCommands ?? TWO_COMMITS;
}
