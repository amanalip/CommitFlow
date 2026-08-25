# CommitFlow Improvement Checklist

Desktop-focused implementation checklist for functional correctness, UX, visual polish, accessibility, performance, and test coverage.

## P0: Repository and command correctness

- [ ] Isolate Explainer repositories from Playground state so running an explanation never resets or changes the active playground.
- [ ] Preserve the Playground repository, command history, selected scenario, and current step when entering and leaving Explainer mode.
- [ ] Stop and cancel scenario playback when changing modes, resetting the repository, or loading shared history.
- [ ] Add a serialized command queue so terminal commands, quick actions, scenarios, Explainer runs, URL replay, and Reset cannot mutate the engine concurrently.
- [ ] Prevent Explainer preset buttons from starting overlapping simulations while another simulation is running.
- [ ] Distinguish shell `rm` from `git rm` in the parsed command model.
- [ ] Route `git rm` and `git rm --cached` to the Git engine instead of the filesystem-only delete handler.
- [ ] Correct cherry-pick so it applies the selected commit's changes and produces the expected working tree and index.
- [ ] Correct rebase so it reapplies each commit's tree changes instead of only recreating commit messages.
- [ ] Correct revert so it applies an inverse patch to the current tree without replacing unrelated later changes.
- [ ] Verify and correct soft, mixed, and hard reset behavior, including index contents, working tree contents, and whether HEAD stays attached to the current branch.
- [ ] Make `git branch -d` enforce merged-branch safety while keeping `-D` as the force-delete path.
- [ ] Return an error when `git restore` targets a missing or untracked path instead of silently succeeding.
- [ ] Preserve staged, unstaged, deleted, and untracked file contents correctly through stash push and pop.
- [ ] Support selecting a specific stash or only show Pop on the top stash so every row does not pop `stash@{0}`.
- [ ] Fix short status output to report `A`, `M`, and `D` accurately for staged files.
- [ ] Remove the duplicate `Date:` line from standard `git log` output.
- [ ] Support common combined flags such as `git commit -am "message"`, or clearly reject unsupported combined forms.
- [ ] Respect `--` as the end of options so filenames beginning with a hyphen are treated as positional arguments.
- [ ] Detect unmatched quotes and trailing escape characters and return a helpful parser error.

## P0: Terminal lifecycle and interaction

- [ ] Make repository Reset clear terminal scrollback, input, cursor state, internal command history, pending execution state, and the visible prompt.
- [ ] Refresh the visible prompt immediately after branch switches and other quick actions initiated outside the terminal.
- [ ] Echo scenario, state-panel, and shared-history commands into the terminal so external actions are visible and understandable.
- [ ] Render stdout and stderr for commands triggered outside the terminal.
- [ ] Initialize the xterm instance once instead of recreating it whenever the theme changes.
- [ ] Preserve scrollback and command history when toggling themes.
- [ ] Use xterm `onData` for normal text entry, multi-character paste, and composed input.
- [ ] Reserve `onKey` for navigation and keyboard shortcuts.
- [ ] Confirm paste works for multiline and quoted commands, and define whether multiline input is supported or rejected.
- [ ] Keep the terminal focused after Clear, Reset, scenario steps, and state-panel quick actions when appropriate.
- [ ] Make the terminal header Clear action behave consistently with the `clear` command and `Ctrl+L`.
- [ ] Show an unobtrusive busy state while a command is executing instead of silently ignoring input.

## P0: Explainer correctness

- [ ] Give every Explainer preset a command-specific repository fixture.
- [ ] Give the commit preset a staged change to commit.
- [ ] Give the merge preset two valid branches with a meaningful merge result.
- [ ] Give the rebase preset diverged main and feature histories.
- [ ] Give reset presets enough history and staged state to demonstrate soft, mixed, and hard differences.
- [ ] Give revert a non-root commit whose inverse change can be shown safely.
- [ ] Display command errors as errors instead of presenting them as successful explanations.
- [ ] Show file, branch, HEAD, staging, and working-tree differences in addition to commit-count differences.
- [ ] Highlight exactly what changed between Before and After.
- [ ] Use unique graph identifiers or element refs for every comparison graph.
- [ ] Ensure exporting the After graph never exports the Before graph.
- [ ] Disable or redefine header Reset and Share actions in Explainer mode so they operate on the visible content.

## P1: Terminal visual treatment

- [ ] Add a terminal background token to both themes.
- [ ] Assign the terminal background token as a root CSS variable when the theme changes.
- [ ] Apply the same themed background to the terminal container, wrapper, xterm viewport, screen, and scrollbar.
- [ ] Remove the thick black gutter caused by the undefined `--bg-terminal` fallback.
- [ ] Replace the heavy terminal frame with a subtle one-pixel border and a soft shadow.
- [ ] Keep a small inset around xterm only if the inset matches the terminal background.
- [ ] Give the terminal header a deliberate surface contrast from the terminal body in both themes.
- [ ] Restyle the scrollbar to match the selected theme.
- [ ] Improve terminal selection colors and cursor visibility in both themes.
- [ ] Standardize the terminal title, window dots, Clear action, padding, and typography with the rest of the application.

## P1: Graph usability and appearance

- [ ] Remove the duplicated graph zoom and fit controls.
- [ ] Build one cohesive toolbar using React Flow `Panel`, `Controls`, `MiniMap`, and `colorMode` features.
- [ ] Put PNG and SVG options inside one Export menu.
- [ ] Theme React Flow's built-in controls so the white control stack never appears in dark mode.
- [ ] Pass the active theme background into PNG and SVG export instead of hard-coding dark navy.
- [ ] Exclude UI controls from exported graph images unless explicitly requested.
- [ ] Show export progress, success, and failure feedback.
- [ ] Use stable, descriptive export filenames.
- [ ] Set a maximum fit zoom near `1` so short histories remain readable instead of shrinking excessively.
- [ ] Refit when the graph container changes size.
- [ ] Avoid resetting the viewport after every repository update when the user has manually panned or zoomed.
- [ ] Add a Follow HEAD option for users who want automatic viewport movement.
- [ ] Increase commit-node text to at least 12px for primary information.
- [ ] Improve long commit-message handling with a readable tooltip or expandable node rather than relying only on truncation.
- [ ] Reduce excessive node glow and continuous HEAD pulsing.
- [ ] Respect `prefers-reduced-motion` for HEAD animation and graph transitions.
- [ ] Make commit nodes keyboard-focusable and operable with Enter and Space.
- [ ] Add clear focus and selected states that are distinct from hover.
- [ ] Use a commit lookup set in layout generation instead of repeated `commits.some` scans.
- [ ] Document or remove the silent 100-commit history limit.

## P1: Desktop workspace layout

- [ ] Add horizontal and vertical resize handles between graph, terminal, and repository-state panes.
- [ ] Persist pane sizes in local storage.
- [ ] Provide a Restore Default Layout action.
- [ ] Allow the terminal and state pane to be maximized temporarily.
- [ ] Reduce the large unused canvas area when the repository contains only one or two commits.
- [ ] Remove the fixed copyright footer from the primary workspace or move attribution into an About menu.
- [ ] Keep important controls aligned to a consistent desktop grid.
- [ ] Prevent header wrapping at supported desktop widths by moving secondary actions into a menu if needed.

## P1: Empty state and onboarding

- [ ] Replace “Type git commit” with accurate first-run guidance that starts with `git init`.
- [ ] Add a Start Your First Repository action.
- [ ] Add a Load Guided Scenario action.
- [ ] Add an Open Command Reference action.
- [ ] Show a short three-step getting-started card for initializing, staging, and committing.
- [ ] Make starter commands clickable or copyable.
- [ ] Show “Repository not initialized” in state panels instead of “Working directory is clean” before `git init`.
- [ ] Give every empty state a useful next action instead of presenting only status text.

## P1: Scenario learning experience

- [ ] Replace the basic scenario select with a richer scenario browser or popover.
- [ ] Show category, difficulty, summary, estimated time, step count, and progress for each scenario.
- [ ] Display the current command prominently during playback.
- [ ] Display the current step explanation and expected result.
- [ ] Clarify whether the step description refers to the next step or the step just completed.
- [ ] Replace the ambiguous completion display with an explicit Scenario Complete state.
- [ ] Keep Previous, Next, Play, Pause, Restart, and speed controls visually grouped.
- [ ] Use more readable playback delays and avoid a default speed that hides intermediate state changes.
- [ ] Add a true divergent merge scenario that creates and visualizes a merge commit with two parents.
- [ ] Verify that the cherry-pick, rebase, detached HEAD, undo, and stash lessons teach correct file-state behavior.
- [ ] Avoid rebuilding every previous step during Step Back by using engine checkpoints or repository snapshots.
- [ ] Keep explanation state synchronized when stepping backward.
- [ ] Add a completion summary with the final graph and learned concepts.

## P1: State panels and quick actions

- [ ] Change individual Unstage to `git restore --staged <file>`.
- [ ] Shell-quote filenames used in quick actions so paths containing spaces work.
- [ ] Show the command a quick action will run in a tooltip or secondary label.
- [ ] Display command output or failure when a quick action runs.
- [ ] Add confirmation for destructive actions such as discarding changes, hard reset, branch deletion, and stash drop.
- [ ] Add useful branch actions such as create, rename, copy name, and delete where supported.
- [ ] Add stash apply, pop, drop, and clear actions with the correct stash reference.
- [ ] Add tag copy and delete actions where supported.
- [ ] Improve file rows with consistent status icons, labels, truncation, and full-path tooltips.
- [ ] Use correct ARIA tab roles for Working Directory, Staging Area, Branches and Tags, and Stashes.
- [ ] Support arrow-key navigation between state tabs.

## P1: Sharing, reset, and feedback

- [ ] Await clipboard writes before reporting success.
- [ ] Show a useful error if clipboard access is denied or unavailable.
- [ ] Disable Share when there is no reproducible Playground history.
- [ ] Ensure the shared URL represents the repository currently visible to the user.
- [ ] Add a version field to shared-history payloads for future compatibility.
- [ ] Show replay progress while loading a shared URL.
- [ ] Lock or queue new commands until shared-history replay completes.
- [ ] Prevent Reset from racing with active commands or replay.
- [ ] Confirm Reset when meaningful work will be discarded.
- [ ] Use a consistent toast system for copy, export, reset, staging, branch switching, and failures.
- [ ] Use `aria-live` regions for transient success and error feedback.

## P2: Visual system and aesthetic polish

- [ ] Define a complete semantic token set for page, surface, elevated surface, terminal, border, text, muted text, accent, success, warning, and danger.
- [ ] Define consistent control heights, radii, spacing, shadows, and icon sizes.
- [ ] Reduce the number of competing borders across the interface.
- [ ] Use three clearly differentiated surface levels instead of many similar navy rectangles.
- [ ] Reserve cyan for primary actions, selection, focus, and active state.
- [ ] Use neutral styling for secondary actions such as Reset, Export, and Clear.
- [ ] Replace emoji interface icons with Lucide icons, which is already installed.
- [ ] Give icon-only buttons explicit accessible names and polished tooltips.
- [ ] Improve typography hierarchy for page title, section title, labels, metadata, code, and helper text.
- [ ] Avoid 10px text for meaningful information.
- [ ] Normalize hover, pressed, selected, focus, loading, disabled, success, and error states.
- [ ] Add subtle, purposeful transitions for state changes without making the interface feel animated for its own sake.
- [ ] Use Framer Motion only for useful transitions such as drawers, toasts, and major state changes, or remove it if it remains unused.
- [ ] Ensure light and dark themes feel designed independently instead of functioning as color inversions.
- [ ] Check all muted text, badges, lane colors, and controls against WCAG AA contrast.

## P2: Commit inspector and explanations

- [ ] Replace the centered Commit Inspector modal with a right-side desktop drawer that preserves graph context.
- [ ] Show changed files and additions/deletions in the inspector.
- [ ] Keep parent navigation inside the drawer and provide a clear navigation history.
- [ ] Add Copy SHA feedback that waits for clipboard success.
- [ ] Give dialogs and drawers `role="dialog"`, `aria-modal`, and labelled titles.
- [ ] Trap focus while a modal or drawer is open.
- [ ] Restore focus to the element that opened the modal or drawer.
- [ ] Remove duplicate global Escape listeners and centralize overlay behavior.
- [ ] Consider an inline activity or explanation panel so “What Just Happened?” is not separated from the command that caused it.

## P2: Accessibility and keyboard support

- [ ] Add visible `:focus-visible` styles to every interactive control.
- [ ] Give the Playground and Explainer switch proper pressed-state or tab semantics.
- [ ] Give the theme button an explicit accessible name such as “Switch to light theme”.
- [ ] Mark decorative SVG and emoji content as hidden from assistive technology.
- [ ] Ensure all controls have names that do not depend on the `title` attribute.
- [ ] Provide keyboard access to commit nodes, graph controls, tabs, scenario controls, inspector navigation, and menus.
- [ ] Announce command execution, errors, branch changes, and scenario progress without flooding screen-reader output.
- [ ] Respect reduced-motion preferences throughout the interface.
- [ ] Verify logical focus order across the header, graph, terminal, state panel, and overlays.

## P2: Performance and maintainability

- [ ] Lazy-load Explainer mode.
- [ ] Lazy-load PNG and SVG export code so `html-to-image` is not part of the initial bundle.
- [ ] Split large vendor chunks for React Flow, xterm, and the Git engine where practical.
- [ ] Address the current Vite warning for the roughly 1.07 MB minified JavaScript bundle.
- [ ] Remove Framer Motion if it is not used after the visual polish work.
- [ ] Move repeated inline styles into CSS modules and shared primitives.
- [ ] Create reusable Button, IconButton, Tabs, Tooltip, Toast, Dialog, and Menu components.
- [ ] Replace string operation names in `gitBridge.send` with a typed operation map.
- [ ] Add an application error boundary with a recoverable Reset action.
- [ ] Surface currently swallowed fit, export, filesystem, and snapshot errors during development.
- [ ] Review filesystem error handling so unexpected directory and write failures are not silently ignored.

## Test coverage

- [ ] Test that Reset clears repository state and terminal state together.
- [ ] Test that theme switching preserves terminal output, history, input, and prompt state.
- [ ] Test multi-character paste and quoted command paste in xterm.
- [ ] Test quick actions while the terminal is focused.
- [ ] Test per-file Unstage with multiple staged files.
- [ ] Test `git rm` and `git rm --cached` independently from shell `rm`.
- [ ] Test Playground and Explainer state isolation.
- [ ] Test switching modes during scenario playback.
- [ ] Test overlapping Explainer preset clicks and command serialization.
- [ ] Test every Explainer preset for its intended successful state change.
- [ ] Test that Before and After exports target the correct graph.
- [ ] Test light and dark export backgrounds.
- [ ] Test clipboard success and failure states.
- [ ] Test shared-history loading, replay progress, cancellation, and malformed payloads.
- [ ] Test that cherry-pick applies the expected file changes.
- [ ] Test that rebase preserves and reapplies feature file changes.
- [ ] Test that revert preserves unrelated later changes.
- [ ] Test soft, mixed, and hard reset index, working-tree, branch, and HEAD semantics.
- [ ] Test stash restoration of staged, unstaged, deleted, and untracked files.
- [ ] Test status codes for staged added, modified, and deleted files.
- [ ] Test combined flags, option termination, unmatched quotes, and filenames containing spaces.
- [ ] Test keyboard navigation and focus restoration for dialogs, tabs, graph nodes, and scenario controls.
- [ ] Add visual regression screenshots for the main desktop workspace, terminal, Explainer, scenarios, inspector, empty state, dark theme, and light theme.
- [ ] Add browser tests for long histories, graph resizing, manual viewport preservation, and Follow HEAD.

## Final verification

- [ ] Run all unit and integration tests.
- [ ] Run the complete browser end-to-end suite.
- [ ] Build the production bundle without TypeScript errors.
- [ ] Confirm the large-chunk warning has been removed or intentionally documented.
- [ ] Perform a desktop visual review at 1280x720, 1440x900, 1920x1080, and an ultrawide viewport.
- [ ] Verify both themes across every major screen and overlay.
- [ ] Verify keyboard-only operation of every major feature.
- [ ] Verify all commands shown in help and README behave as documented.
- [ ] Update README feature claims and `bugs_fixes.md` to match verified behavior.
