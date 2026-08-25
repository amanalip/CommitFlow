<p align="center">
  <img src="public/logo.svg" alt="CommitFlow Logo" width="320" />
</p>

<p align="center">
  <strong>Watch commits flow.</strong>
</p>

<p align="center">
  <a href="https://amanalip.github.io/CommitFlow/">Live Demo</a> •
  <a href="#features">Features</a> •
  <a href="#guided-curriculum">Curriculum</a> •
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
- Supported commands: init, status, log, show, diff, add, restore, rm, commit, branch, checkout, switch, merge, rebase, cherry-pick, reset, revert, stash, tag, and help.
- Supported learning utilities: touch, echo with overwrite or append, cat, ls, clear, and reset.
- Git-style help is available through `git --help`, `git help <command>`, and `git <command> --help`.

### Terminal UI
- xterm.js terminal emulator.
- Command history navigation (up and down arrow keys).
- Tab completion for git subcommands, branch names, and files.
- Colored output for branches, commit hashes, and error messages.
- Safe quoted paste handling, parser errors for incomplete input, busy feedback, and a serialized command queue.

### Commit Graph Visualization
- Interactive commit DAG canvas built on React Flow.
- Commit nodes showing short SHA, message, author, and branch/tag badges.
- Dedicated HEAD pointer indicator.
- Multi-parent merge commit edges with lane coloring.
- Automatic layout and branch lane assignment.
- Follow HEAD, fit, pan, zoom, lock, navigable minimap, PNG export, SVG export, and container resize refitting.
- Expandable long commit messages and keyboard-operable commit inspection.

### State Panels
- **Working Directory**: File status plus stage and confirmed discard actions.
- **Staging Area**: Staged and unstaged changes, including files that appear in both states.
- **Branches, tags, and stashes**: Quick actions show the exact Git command and confirm destructive changes.
- **Commit Inspector**: Inspect the full SHA, author, timestamp, tree OID, parents, refs, and full message.

### Step-by-Step Scenario Playback
- 42 guided lessons spanning first commits, inspection, staging, branches, merging, history editing, recovery, stashes, and releases.
- Every lesson contains 15 to 20 teaching blocks with objectives, prerequisites, concepts, exact commands, expected effects, Git areas, output, and completion summaries.
- Search by topic and difficulty, inspect the lesson map, move one block at a time, or play at a learner-friendly pace.

### Command Laboratory
- 27 guided command examples with purpose-built repository fixtures.
- Searchable categories and difficulty filters.
- Command anatomy, prerequisites, expected output, cautions, repository effects, and highlighted Before and After state tables.
- Synchronized or independently focused React Flow graphs for detailed comparison.

### Sharing & Export
- Versioned share links store compressed command history in the URL hash and report clipboard failures.
- Share replay is serialized, shows progress, and stops safely if a command fails.
- Export PNG or SVG with stable descriptive filenames.
- Light and dark theme toggle with localStorage persistence.
- Desktop pane sizes persist locally. The graph, terminal, and repository panes are resizable, keyboard adjustable, and temporarily maximizable.
- Destructive Reset, discard, branch, tag, and stash actions require confirmation.

---

## Guided Curriculum

The 42 lessons are organized into repository basics, inspection, staging and files, commits, branches, merging, history editing, recovery, stashes, and tags. Beginner lessons establish the mental model first. Intermediate and advanced lessons then cover divergent merges, rebase, cherry-pick, detached HEAD recovery, reset modes, revert, stash file states, and release workflows.

Lesson playback uses deterministic timestamps and preserves retained commit IDs when stepping backward. Git operations that intentionally create new commits, including amend, revert, cherry-pick, and rebase, explain why their commit IDs change.

The graph reads up to the newest 100 commits for display and teaching performance. Repository operations still work beyond that display window.

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
    StatePanel/           # Files, staging, branches, tags, and stashes
    CommitInspector/      # Commit inspection modal
    PlaybackControls/     # Step-by-step playback bar
    ExplainerMode/        # Command laboratory and state comparison
    ConfirmDialog/        # Destructive action confirmation
    ExplanationModal/     # "What just happened?" modal
  share/
    url-codec.ts          # Versioned lz-string URL payloads
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

# Run the browser workflow tests
npm run test:e2e

# Start local development server
npm run dev

# Build production bundle
npm run build
```

---

## License

GNU General Public License v3.0 (GPL-3.0). See [LICENSE](LICENSE) for details.
Copyright (C) 2026 Aman Ali Pogaku.
