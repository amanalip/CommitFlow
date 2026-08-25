# CommitFlow Reliability Record

This file summarizes the current verified behavior. The detailed work queue and acceptance checklist live in `improvements.md`.

## Command and repository correctness

- Repository mutations run through one serialized queue across the terminal, lessons, quick actions, URL replay, Explainer, and Reset.
- `git --help`, `git -h`, `git help`, `git help <command>`, and `git <command> --help` return simulated command guidance.
- Branch deletion protects unmerged branches with `-d` and permits an explicit forced deletion with `-D`.
- Stash push, pop, drop, and clear preserve and restore staged, unstaged, deleted, and untracked file states.
- Cherry-pick, rebase, revert, detached HEAD recovery, and soft, mixed, and hard reset are verified against repository file state.
- `git rm`, `git restore`, staged diff, short status, combined commit flags, option termination, and quoted paths have dedicated coverage.
- Invalid quotes, trailing escapes, unsupported input, missing paths, and failed commands return useful errors without advancing lesson progress.

## Learning experience

- The Playground includes 42 guided lessons across ten Git topic groups.
- Every lesson has 15 to 20 blocks with objectives, prerequisites, concepts, exact commands, affected Git areas, expected effects, output, and completion guidance.
- Authored lesson commands are preserved when review blocks are added. This prevents final operations such as rebase from being cut off.
- The command laboratory contains 27 searchable, categorized examples with purpose-built fixtures.
- Explainer results compare HEAD, branches, commits, refs, tags, stashes, staged files, unstaged files, untracked files, and command output.
- Before and After graphs can be focused, synchronized, inspected, and exported independently.

## Desktop UI and accessibility

- Dark and light themes use readable terminal, catalog, metadata, graph, and comparison colors.
- Difficulty filters are separated from search and keep their labels inside the pill outline.
- Graph nodes show commit type, ID, author, time, parent count, refs, selection guidance, and expandable long messages.
- The graph refits after a real container resize when Follow HEAD is active.
- Graph, terminal, and repository panes are resizable and keyboard adjustable. Sizes persist locally and can be reset or maximized.
- Destructive actions use a labelled confirmation dialog with the exact command and consequence.
- Dialogs trap focus, close with Escape, and restore focus to their opener.
- Header mode controls and repository state tabs implement tab semantics and arrow-key navigation.
- Clipboard and sharing feedback waits for the actual browser result and exposes failures through live status text.
- Reduced-motion preferences disable nonessential motion.

## Sharing and performance

- Share payloads include a version and remain compatible with legacy command arrays.
- Shared command replay is serialized and displays progress.
- Explainer and graph export code load only when used.
- React, React Flow, xterm, and the Git engine build into separate cacheable chunks.
- The unused Framer Motion dependency was removed.
- The production build completes without the previous large-chunk warning.

## Verification commands

```bash
npm run test
npm run test:e2e
npm run build
```

The exact current test count is reported by Vitest during each run. It is intentionally not hard-coded here because the suite grows with the curriculum and command surface.
