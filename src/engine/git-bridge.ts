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
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: BridgeResponse) => void;
      reject: (reason: any) => void;
    }
  >();
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

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./git-worker.ts', import.meta.url), {
          type: 'module',
        });
        this.worker.onmessage = (e: MessageEvent) => {
          const { id, success, output, error, state, extra } = e.data;
          if (state) {
            this.currentState = state;
            this.notifyListeners(state);
          }
          const pending = this.pendingRequests.get(id);
          if (pending) {
            this.pendingRequests.delete(id);
            if (success) {
              pending.resolve({ success: true, output, state, extra });
            } else {
              pending.resolve({ success: false, error, state });
            }
          }
        };
      } catch {
        this.worker = null;
      }
    }
  }

  public subscribe(listener: (state: RepoState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(state: RepoState) {
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  public async send(type: string, payload: any = {}): Promise<BridgeResponse> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (this.worker) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.set(id, { resolve, reject });
        this.worker!.postMessage({ id, type, payload });
      });
    }

    // Direct fallback for Node / Vitest
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
        case 'COMMIT': {
          const res = await workerEngine.executeCommit(payload.message, payload.allowEmpty);
          output = res.output;
          extra.sha = res.sha;
          break;
        }
        case 'BRANCH':
          output = await workerEngine.executeBranch(payload);
          break;
        case 'CHECKOUT':
          output = await workerEngine.executeCheckout(payload.target, payload.createBranch);
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
        case 'WRITE_FILE':
          output = await workerEngine.executeWriteFile(payload.path, payload.content, payload.append);
          break;
        case 'DELETE_FILE':
          output = await workerEngine.executeDeleteFile(payload.path);
          break;
        case 'READ_FILE':
          output = await workerEngine.executeReadFile(payload.path);
          break;
        case 'RESET_REPO':
          await workerEngine.resetRepository();
          break;
        case 'GET_STATE':
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
