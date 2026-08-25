export type GitFileStatus = 'unmodified' | 'modified' | 'added' | 'deleted' | 'untracked';

export interface WorkingFile {
  path: string;
  status: GitFileStatus;
  staged: boolean;
  content?: string;
  oldContent?: string;
}

export interface CommitInfo {
  oid: string;
  shortOid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
  committer: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
  parentOids: string[];
  treeOid: string;
  branches: string[];
  tags: string[];
  isHead: boolean;
}

export interface BranchRef {
  name: string;
  oid: string;
  isCurrent: boolean;
  isRemote?: boolean;
}

export interface TagRef {
  name: string;
  oid: string;
  annotated?: boolean;
}

export interface HeadInfo {
  type: 'branch' | 'detached';
  target: string; // branch name or commit oid
  oid?: string;
}

export interface RepoState {
  initialized: boolean;
  head: HeadInfo;
  branches: BranchRef[];
  tags: TagRef[];
  commits: CommitInfo[];
  stagedFiles: WorkingFile[];
  unstagedFiles: WorkingFile[];
  untrackedFiles: string[];
  stashes: { index: number; message: string; oid: string }[];
}

export type GitCommandType =
  | 'init'
  | 'add'
  | 'rm'
  | 'commit'
  | 'branch'
  | 'checkout'
  | 'switch'
  | 'merge'
  | 'rebase'
  | 'cherry-pick'
  | 'log'
  | 'status'
  | 'diff'
  | 'show'
  | 'tag'
  | 'reset'
  | 'revert'
  | 'stash'
  | 'touch'
  | 'echo'
  | 'cat'
  | 'ls'
  | 'clear'
  | 'help';

export interface ParsedCommand {
  raw: string;
  type: GitCommandType | 'unknown';
  args: string[];
  flags: Record<string, string | boolean | string[]>;
  error?: string;
  targetFile?: string;
  fileContent?: string;
  append?: boolean;
}

export interface CommandResult {
  rawCommand: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  explanation?: string;
  state: RepoState;
}

export interface ScenarioStep {
  command: string;
  description: string;
  explanation: string;
  expectedStateNote?: string;
}

export interface Scenario {
  id: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  summary: string;
  description: string;
  initialFiles?: Record<string, string>;
  steps: ScenarioStep[];
}

export interface GraphNodePosition {
  x: number;
  y: number;
  lane: number;
}
