import { RepoState } from '../model/types';
import * as workerEngine from './git-worker';

export interface BridgeResponse<T = any> {
  success: boolean;
  output?: string;
  error?: string;
  state: RepoState;
  extra?: T;
}

class GitBridge {
  private currentState: RepoState = {
    initialized: false,
    head: { type: 'branch', target: 'main' },
    branches: [],
    tags: [],
    commits: [],
    stagedFiles: [],
    unstagedFiles: [],
    untrackedFiles: [],
    stashes: [],
  };
  private listeners = new Set<(state: RepoState) => void>();
  private notificationSuppressionDepth = 0;

  public subscribe(listener: (state: RepoState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(state: RepoState) {
    if (this.notificationSuppressionDepth > 0) return;
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  public async runIsolated<T>(operation: () => Promise<T>): Promise<T> {
    const runtime = workerEngine.startIsolatedRuntime();
    const originalState = this.currentState;
    this.notificationSuppressionDepth++;

    try {
      this.currentState = await workerEngine.snapshotRepoState();
      return await operation();
    } finally {
      workerEngine.restoreRuntime(runtime);
      this.currentState = originalState;
      this.notificationSuppressionDepth--;
      this.notifyListeners(originalState);
    }
  }

  public async send(type: string, payload: any = {}): Promise<BridgeResponse> {
    try {
      let output = '';
      let extra: any = {};

      switch (type) {
        case 'INIT':
          output = await workerEngine.executeInit(payload?.defaultBranch || 'main');
          break;
        case 'ADD':
          output = await workerEngine.executeAdd(payload.files);
          break;
        case 'RM':
          output = await workerEngine.executeRm(payload.files, payload.cached);
          break;
        case 'RESTORE':
          output = await workerEngine.executeRestore(payload.files, payload.staged);
          break;
        case 'COMMIT': {
          const res = await workerEngine.executeCommit(payload.message, payload.allowEmpty, payload.amend);
          output = res.output;
          extra.sha = res.sha;
          break;
        }
        case 'BRANCH':
          output = await workerEngine.executeBranch(payload);
          break;
        case 'CHECKOUT':
          output = await workerEngine.executeCheckout(payload.target, payload.createBranch, payload.startPoint);
          break;
        case 'MERGE':
          output = await workerEngine.executeMerge(payload.theirs, payload.message);
          break;
        case 'REBASE':
          output = await workerEngine.executeRebase(payload.upstream);
          break;
        case 'CHERRY_PICK':
          output = await workerEngine.executeCherryPick(payload.commit);
          break;
        case 'TAG':
          output = await workerEngine.executeTag(payload);
          break;
        case 'RESET':
          output = await workerEngine.executeReset(payload.target, payload.mode);
          break;
        case 'REVERT':
          output = await workerEngine.executeRevert(payload.commit);
          break;
        case 'SHOW':
          output = await workerEngine.executeShow(payload.target);
          break;
        case 'DIFF':
          output = await workerEngine.executeDiff(payload?.staged);
          break;
        case 'STASH':
          output = await workerEngine.executeStash(payload.subcommand, payload.message, payload.reference);
          break;
        case 'WRITE_FILE':
          output = await workerEngine.executeWriteFile(payload.path, payload.content, payload.append);
          break;
        case 'DELETE_FILE':
          output = await workerEngine.executeDeleteFile(payload.path);
          break;
        case 'READ_FILE':
          output = await workerEngine.executeReadFile(payload.path);
          break;
        case 'LS_FILES': {
          const list = await workerEngine.executeListFiles();
          extra.files = list;
          output = list.join('  ');
          break;
        }
        case 'RESET_REPO':
          await workerEngine.resetRepository();
          break;
        case 'GET_STATE':
          break;
        case 'SET_COMMIT_TIME':
          workerEngine.setCommitTimestamp(payload.timestamp);
          break;
        default:
          throw new Error(`Unknown bridge operation: ${type}`);
      }

      const state = await workerEngine.snapshotRepoState();
      this.currentState = state;
      this.notifyListeners(state);
      return { success: true, output, state, extra };
    } catch (err: any) {
      let state: RepoState;
      try {
        state = await workerEngine.snapshotRepoState();
      } catch {
        state = this.currentState;
      }
      this.currentState = state;
      this.notifyListeners(state);
      return { success: false, error: err.message || String(err), state };
    }
  }

  public getState(): RepoState {
    return this.currentState;
  }
}

export const gitBridge = new GitBridge();
