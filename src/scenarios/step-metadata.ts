import { ScenarioStep } from '../model/types';

export interface ScenarioStepMetadata {
  area: 'Setup' | 'Working tree' | 'Staging' | 'History' | 'Branches' | 'Inspection' | 'References';
  effect: string;
  commitBehavior: string;
}

export function getScenarioStepMetadata(step: ScenarioStep): ScenarioStepMetadata {
  const command = step.command;

  if (command === 'git init') {
    return { area: 'Setup', effect: 'Creates repository metadata and attaches HEAD to the default branch.', commitBehavior: 'No commit is created.' };
  }
  if (/^(echo|touch|rm)\b/.test(command)) {
    return { area: 'Working tree', effect: 'Changes files in the working directory only.', commitBehavior: 'Commit history does not change.' };
  }
  if (/^git (status|diff|log|show)\b/.test(command) || /^cat\b/.test(command)) {
    return { area: 'Inspection', effect: 'Reads repository state without changing it.', commitBehavior: 'Commit history does not change.' };
  }
  if (/^git add\b/.test(command)) {
    return { area: 'Staging', effect: 'Copies selected working-tree changes into the staging area.', commitBehavior: 'No commit is created yet.' };
  }
  if (/^git restore --staged\b/.test(command)) {
    return { area: 'Staging', effect: 'Moves selected changes out of the staging area while preserving the working file.', commitBehavior: 'Commit history does not change.' };
  }
  if (/^git restore\b/.test(command)) {
    return { area: 'Working tree', effect: 'Restores selected working files from the staged or committed snapshot.', commitBehavior: 'Commit history does not change.' };
  }
  if (/^git commit --amend\b/.test(command)) {
    return { area: 'History', effect: 'Replaces the latest commit with a corrected snapshot.', commitBehavior: 'The replaced commit receives a new ID.' };
  }
  if (/^git commit\b/.test(command)) {
    return { area: 'History', effect: 'Records the staged snapshot and advances the current branch.', commitBehavior: 'Creates one new commit and moves HEAD.' };
  }
  if (/^git (checkout|switch)\b/.test(command)) {
    return { area: 'Branches', effect: 'Moves HEAD and updates the working tree to the selected branch or commit.', commitBehavior: 'Existing commits do not change.' };
  }
  if (/^git branch\b/.test(command)) {
    return { area: 'Branches', effect: 'Creates or updates a branch reference.', commitBehavior: 'Commit objects do not change.' };
  }
  if (/^git merge\b/.test(command)) {
    return { area: 'History', effect: 'Integrates the selected branch into the current branch.', commitBehavior: 'May fast-forward HEAD or create a two-parent merge commit.' };
  }
  if (/^git rebase\b/.test(command)) {
    return { area: 'History', effect: 'Replays current-branch changes on top of another branch.', commitBehavior: 'Replayed commits intentionally receive new IDs.' };
  }
  if (/^git cherry-pick\b/.test(command)) {
    return { area: 'History', effect: 'Copies one selected change set onto the current branch.', commitBehavior: 'Creates a new commit with a new ID.' };
  }
  if (/^git revert\b/.test(command)) {
    return { area: 'History', effect: 'Applies the inverse of an earlier commit while preserving the original.', commitBehavior: 'Creates a new revert commit and moves HEAD.' };
  }
  if (/^git reset\b/.test(command)) {
    return { area: 'History', effect: 'Moves HEAD and may reset the index or tracked working files.', commitBehavior: 'Does not create a commit.' };
  }
  if (/^git stash\b/.test(command)) {
    return { area: 'Working tree', effect: 'Stores, lists, or restores temporary work.', commitBehavior: 'Branch commit history does not change.' };
  }
  if (/^git tag\b/.test(command)) {
    return { area: 'References', effect: 'Creates, lists, or deletes a stable name for a commit.', commitBehavior: 'Commit objects do not change.' };
  }

  return { area: 'Setup', effect: 'Runs the selected learning command.', commitBehavior: 'Review the graph and repository panels for the result.' };
}
