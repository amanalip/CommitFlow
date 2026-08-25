# CommitFlow: Bug Fixes, Test Enhancements & UX Improvements

This document tracks all verified bug fixes, test expansions, and UI/UX improvements made to the CommitFlow codebase.

---

## 1. Verified Bug Fixes

1. **Missing Buffer Global Polyfill in Browser Runtime**:
   - *Problem*: `isomorphic-git` internally requires Node.js `Buffer`. When bundled without a browser polyfill, calling commit operations threw `ReferenceError: Buffer is not defined`.
   - *Fix*: Added `buffer` package and polyfilled `Buffer` across `src/main.tsx` and `src/engine/git-worker.ts`.

2. **Dual-Thread IndexedDB Lock Collision**:
   - *Problem*: When Web Worker and main thread concurrently initialized LightningFS on the same database name, `navigator.locks` triggered `AbortError: Lock broken by another request with the steal option`.
   - *Fix*: Unified the in-memory engine execution bridge, eliminating concurrency contention.

3. **xterm.js Dimensions Crash in React Mount**:
   - *Problem*: Synchronous `fit()` invocations before container layout caused viewport dimension errors.
   - *Fix*: Wrapped resize and initial fit in `safeFit()` checking `clientWidth > 0 && clientHeight > 0` with proper cleanup.

4. **Terminal Key Event Listener Leak & Disposal During Execution**:
   - *Problem*: Re-attaching `term.onKey` on every React state change dropped keystrokes typed during async operations.
   - *Fix*: Stabilized terminal listeners using persistent refs (`repoStateRef`, `onExecuteCommandRef`).

5. **Shell Redirection Quote Parser**:
   - *Problem*: Regular expressions for `>` and `>>` split inside quoted strings (e.g. `echo "hello > world" > file.txt`).
   - *Fix*: Replaced regex with quote-aware character scanner in `src/parser/command-parser.ts`.

6. **Boolean Flag Consumption in Command Parser**:
   - *Problem*: Long flags like `--allow-empty`, `--soft`, and `--hard` swallowed subsequent arguments like `-m "message"`.
   - *Fix*: Added `KNOWN_BOOLEAN_FLAGS` set to ensure boolean flags do not consume following positional arguments.

7. **Detached HEAD to Named Branch Transition**:
   - *Problem*: Running `git checkout <branch>` from detached HEAD state did not update `.git/HEAD` symbolic reference.
   - *Fix*: Explicitly updated `.git/HEAD` with `ref: refs/heads/<branch>` on checkout in `src/engine/git-worker.ts`.

8. **Chronological & Topological Commit Ordering**:
   - *Problem*: `snapshotRepoState` extracted Map values without topological sorting, causing out-of-order nodes in React Flow.
   - *Fix*: Implemented Kahn's topological sort with timestamp tie-breakers for commit arrays.

9. **Corrupted URL Hash Exception Handling**:
   - *Problem*: Visiting malformed share URLs crashed `JSON.parse` during decompression.
   - *Fix*: Wrapped URL hash decoder in a try-catch block returning an empty array on invalid inputs.

10. **Branch Deletion Parser Handling**:
    - *Problem*: `git branch --delete <branch>` failed to extract branch names when parsed as a flag parameter.
    - *Fix*: Normalized `-d`, `-D`, and `--delete` flag extraction across parser and command map.

11. **Filesystem Append Redirection (`>>`) Support**:
    - *Problem*: File appends did not preserve existing content properly in virtual filesystem writes.
    - *Fix*: Read existing file content and appended before writing in `executeWriteFile`.

12. **Missing Implementation for Git Diff & Git Show**:
    - *Problem*: `git diff` and `git show` were registered as valid commands in parser but threw "Unsupported command" errors.
    - *Fix*: Implemented `executeDiff` and `executeShow` with color-coded additions, deletions, and metadata formatting.

13. **Missing Implementation for Git Stash & Amend**:
    - *Problem*: `git stash` and `git commit --amend` were not wired to engine handlers.
    - *Fix*: Implemented `executeStash` (push, pop, list, clear) and commit amending with parent preservation.

14. **Relative Merge Commit Ref Resolution (`HEAD^2`)**:
    - *Problem*: Caret refs only matched trailing `^` characters without index numbers, failing on second parent `HEAD^2`.
    - *Fix*: Added regex resolution for `HEAD^N` targeting specific merge parents.

15. **Terminal Line Editing & Cursor Control**:
    - *Problem*: ArrowLeft, ArrowRight, Home, End, Ctrl+A, Ctrl+E, Ctrl+U, and Ctrl+C were ignored or produced unescaped characters.
    - *Fix*: Added full inline buffer navigation and keyboard shortcut dispatchers in `Terminal.tsx`.

---

## 2. UX and UI Improvements

1. **Brand SVG Vector Logo**: Implemented clean branch DAG SVG mark with high contrast for dark and light themes.
2. **Interactive Node Click Inspector**: Clicking any commit node opens a modal with full SHA, author, timestamp, tree OID, parents, and message.
3. **Parent Commit Click Navigation**: Clicking any parent SHA pill in CommitInspector directly jumps to and inspects that parent commit.
4. **Copy to Clipboard Feedback**: Added visual "Copied" feedback badges when copying commit SHAs, share links, and branch names.
5. **Graph Zoom and Minimap Controls**: Added zoom in, zoom out, fit view, and toggleable React Flow minimap.
6. **Dual Format Graph Export**: Added buttons to export the commit graph as both high-resolution PNG and vector SVG.
7. **1-Click Stage Actions**: Added "+ Stage" buttons in the Working Directory panel to stage files with one click.
8. **1-Click Stage All Action**: Added "+ Stage All (N)" button when multiple untracked/modified files are present.
9. **1-Click Unstage Actions**: Added "− Unstage" buttons in the Staging Area panel to unstage files instantly.
10. **1-Click Unstage All Action**: Added "− Unstage All (N)" button to unstage all staged files with one click.
11. **Dedicated Stash Management Tab**: Added a Stashes tab in StatePanel allowing one-click stash inspection and "Pop" application.
12. **1-Click Branch Switch**: Added "Switch" button in the Branches list to switch active branch directly.
13. **Active Branch Identification**: Distinct badge and styling for active branch with disabled switch actions.
14. **HEAD Pulse Ring**: Added animated pulsing glow to the active HEAD commit node.
15. **Color-Coded Branch Badges**: Branch badges match topological lane colors with contrasting backgrounds.
16. **Terminal Keyboard Navigation**: Added `ArrowLeft`, `ArrowRight`, `Ctrl+A`/`Home`, and `Ctrl+E`/`End` inline cursor navigation.
17. **Terminal Shortcuts**: Added `Ctrl+L` to clear screen, `Ctrl+C` to cancel prompt, and `Ctrl+U` to erase line.
18. **Global Modal Shortcuts**: Added global `Escape` key listener to dismiss all active inspector and explanation modals.
19. **Explanation Modal Copy**: Added one-click copy button for command explanation text.
20. **Quick Preset Examples in Explainer Mode**: Added quick-try buttons for popular commands (`git commit`, `git checkout -b`, `git merge`, `git rebase`, `git reset`, `git revert`, `git tag`).
21. **Scenario Progress Indicator**: Added step counter and description tracker in the playback controls bar.
22. **Accessible Color Contrast**: Tuned theme tokens for WCAG AA contrast across terminal text, graph nodes, and badges.
23. **Clean Working Tree Guidance**: Informative empty states for clean working directories, empty staging areas, and fresh repos.
24. **GitHub Logo & Navigation Link**: Header includes direct link to source repository.
25. **Author Copyright Footer**: Added footer with author attribution and license notice.

---

## 3. Test Suite Enhancements (58 Automated Tests Across 10 Suites)

- **Tokenizer and Parser Tests (18 Tests - `tests/parser.test.ts`)**:
  - Quoted strings with special characters and semicolons.
  - Boolean flags with follow-up `-m` arguments.
  - Shell redirect commands (`>` and `>>`).
  - Filesystem utilities (`touch`, `cat`, `ls`, `clear`).
  - Branch deletion flags (`-d`, `-D`, `--delete`).
  - Stash push and pop parsing.
  - Diff and show argument parsing.
  - Log oneline and graph flags.
  - Commit amend parsing.
  - Multi-token auto-complete candidate generation.
- **Engine Tests (11 Tests - `tests/engine.test.ts`)**:
  - Complete git workflow (`init`, `touch`, `add`, `commit`, `branch`, `checkout`, `merge`).
  - Branch deletion flow.
  - Detached HEAD transitions and branch reattachment.
  - Soft, mixed, and hard reset operations.
  - Revert and cherry-pick executions.
  - Git diff and git show inspect commands.
  - Git stash push and pop flow.
  - Git commit amend.
  - Filesystem read, write, and append operations.
  - Multi-file staging and creation.
  - Tag deletion with `-d`.
- **Output Formatter Tests (6 Tests - `tests/output_formatter.test.ts`)**:
  - Uninitialized repository status formatting.
  - Clean working tree status formatting.
  - Multi-file status formatting with staged, unstaged, and untracked files.
  - Detached HEAD status message.
  - Commit log formatting in oneline and multi-line modes.
  - Help text completeness across git and utility commands.
- **Virtual Filesystem Tests (3 Tests - `tests/fs.test.ts`)**:
  - Directory recursion and file writing/reading.
  - Recursive directory listing excluding `.git`.
  - Clean filesystem resets.
- **Scenarios Data Schema Tests (2 Tests - `tests/scenarios_unit.test.ts`)**:
  - Bundle size validation (>= 7 scenarios).
  - Schema validity across steps, descriptions, and commands.
- **Share Codec Tests (4 Tests - `tests/share.test.ts`)**:
  - Compression and decompression integrity.
  - Empty input handling.
  - Corrupted and malformed hash resilience.
  - Unicode character and emoji handling in commit messages.
- **Layout & Lane Assignment Tests (4 Tests - `tests/layout.test.ts`)**:
  - Lane assignment without collisions.
  - React Flow nodes and edges generation.
  - Merge commits with two parents in DAG layout.
  - Empty commit history handling.
- **Theme & Palette Tests (2 Tests - `tests/theme.test.ts`)**:
  - Token integrity for dark and light themes.
  - Palette contrast and modulo wrapping for topological lanes.
- **Scenario Execution Tests (7 Tests - `tests/scenarios.test.ts`)**:
  - Automated execution of all 7 bundled learning scenarios.
- **Browser End-to-End Tests (1 Test - `tests/e2e.test.ts`)**:
  - Playwright browser session typing interactive commands, verifying live DOM nodes, mode switching, footer, and repository links.
