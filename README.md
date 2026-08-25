<p align="center">
  <img src="public/logo.svg" alt="CommitFlow Logo" width="320" />
</p>

<p align="center">
  <strong>Watch commits flow.</strong>
</p>

<p align="center">
  <a href="https://amanalip.github.io/CommitFlow/">Live Demo</a> •
  <a href="#features">Features</a> •
  <a href="#bundled-scenarios">Scenarios</a> •
  <a href="#local-development">Local Setup</a>
</p>

---

CommitFlow is an in-browser Git playground that lets you type real git commands and watch the commit graph build in real time. Every command runs against an in-memory Git repository (powered by isomorphic-git and Web Workers). The commit graph, branch pointers, HEAD, staging area, and working directory all update visually after each step.

No backend, no accounts, and no installs required. The application runs entirely in your browser tab as a static site on GitHub Pages.

---

## Two Modes

| Mode | Input | Output |
|---|---|---|
| **Playground** | Type git commands in an interactive terminal, one by one | Live commit graph that updates after each command |
| **Explainer** | Paste or select a git command you want to inspect | Visual before/after breakdown showing state changes |

---

## Features

### In-Browser Git Engine
- Pure JavaScript Git engine via isomorphic-git inside a Web Worker.
- In-memory virtual filesystem via lightning-fs.
- Real commit SHAs, branch references, and merge calculations.
- Supported commands: init, add, rm, commit, branch, checkout, switch, merge, rebase, cherry-pick, tag, reset (--soft, --mixed, --hard), revert, status, log, diff, and filesystem commands (touch, echo, cat, ls).

### Terminal UI
- xterm.js terminal emulator.
- Command history navigation (up and down arrow keys).
- Tab completion for git subcommands, branch names, and files.
- Colored output for branches, commit hashes, and error messages.

### Commit Graph Visualization
- Interactive commit DAG canvas built on React Flow.
- Commit nodes showing short SHA, message, author, and branch/tag badges.
- Dedicated HEAD pointer indicator.
- Multi-parent merge commit edges with lane coloring.
- Automatic layout and branch lane assignment.

### State Panels
- **Working Directory**: File list with status indicators (untracked, modified, deleted, added).
- **Staging Area**: Staged vs unstaged changes side by side.
- **Branches & Tags**: Local branch list with active branch marker and release tags.
- **Commit Inspector**: Click any commit node to inspect full SHA, author, timestamp, tree OID, parents, and message.

### Step-by-Step Scenario Playback
- Bundled learning scenarios for step-by-step learning.
- Playback controls: Step Back, Step Forward, Play All, speed controls (0.5x, 1x, 2x), and Reset.

### Sharing & Export
- Share links: Command history compressed with lz-string and stored in URL hash.
- Share link replay: Opening a shared link replays the full command sequence.
- Export PNG of the current commit graph.
- Light and dark theme toggle with localStorage persistence.

---

## Bundled Scenarios

| Scenario | Focus |
|---|---|
| **Your First Repo** | Initializing a repo, staging files, and recording commits |
| **Branching & Merging** | Creating branches, switching branches, and fast-forward merges |
| **Rebasing a Feature** | Replaying feature commits on top of main for linear history |
| **Detached HEAD Recovery** | Understanding detached HEAD and saving commits with a branch |
| **Cherry-Picking** | Applying individual commits across branches |
| **Undoing Mistakes** | Comparing reset modes and reverting commits safely |
| **Tagging Releases** | Creating and managing release tags |

---

## Architecture

```
src/
  engine/
    git-worker.ts         # Web Worker running isomorphic-git operations
    git-bridge.ts         # Main thread message RPC bridge
    fs-setup.ts           # lightning-fs virtual filesystem setup
  parser/
    command-parser.ts     # Shell tokenizer and git argument parser
    command-map.ts        # Map parsed operations to git engine handlers
    output-formatter.ts   # Terminal output formatting matching git CLI
    suggestions.ts        # Typo suggestions and tab completions
  model/
    types.ts              # Core data models and interfaces
  layout/
    graph-layout.ts       # Graph DAG node positioning
    lane-assignment.ts    # Branch lane allocator
  graph/
    CommitGraph.tsx       # React Flow container and canvas
    CommitNode.tsx        # Custom node component
    BranchEdge.tsx        # Custom branch edge
    png-export.ts         # PNG graph export via html-to-image
  ui/
    Header/               # Header, mode toggle, scenario picker, sharing, theme
    Terminal/             # xterm.js terminal integration
    StatePanel/           # Working directory, staging, and branch panels
    CommitInspector/      # Commit inspection modal
    PlaybackControls/     # Step-by-step playback bar
    ExplainerMode/        # Explainer before/after view
    ExplanationModal/     # "What just happened?" modal
  share/
    url-codec.ts          # lz-string URL hash compression and decompression
  scenarios/
    data/                 # Learning scenario definitions
  theme/
    theme.ts              # Theme tokens and palettes
```

---

## Local Development

### Requirements
- Node.js 20 or higher
- npm 10 or higher

### Setup

```bash
# Clone the repository
git clone https://github.com/amanalip/CommitFlow.git
cd CommitFlow

# Install dependencies
npm install

# Run automated tests
npm run test

# Start local development server
npm run dev

# Build production bundle
npm run build
```

---

## License

GNU General Public License v3.0 (GPL-3.0). See [LICENSE](LICENSE) for details.
Copyright (C) 2026 Aman Ali Pogaku.
