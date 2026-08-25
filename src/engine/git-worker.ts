import git from 'isomorphic-git';
import { getFS, resetFS, ensureDir, listAllFiles, readTextFile, writeTextFile } from './fs-setup';
import { RepoState, CommitInfo, BranchRef, TagRef, WorkingFile } from '../model/types';

const REPO_DIR = '/repo';
let fs = getFS();
let pfs = fs.promises;

let defaultAuthor = {
  name: 'CommitFlow User',
  email: 'user@commitflow.dev',
};

export function setAuthor(name: string, email: string) {
  defaultAuthor = { name, email };
}

async function isRepoInitialized(): Promise<boolean> {
  try {
    await pfs.stat(`${REPO_DIR}/.git`);
    return true;
  } catch {
    return false;
  }
}

export async function resolveCommitRef(ref: string): Promise<string> {
  const matchTilde = ref.match(/^(.*?)~(\d+)$/);
  const matchCaret = ref.match(/^(.*?)\^+$/);

  if (matchTilde) {
    const baseRef = matchTilde[1] || 'HEAD';
    const depth = parseInt(matchTilde[2], 10);
    let currentOid = await resolveCommitRef(baseRef);
    for (let i = 0; i < depth; i++) {
      const commit = await git.readCommit({ fs, dir: REPO_DIR, oid: currentOid });
      if (!commit.commit.parent || commit.commit.parent.length === 0) {
        throw new Error(`fatal: reference ${ref} has no parent at depth ${i + 1}`);
      }
      currentOid = commit.commit.parent[0];
    }
    return currentOid;
  }

  if (matchCaret) {
    const baseRef = matchCaret[1] || 'HEAD';
    const carets = ref.length - baseRef.length;
    let currentOid = await resolveCommitRef(baseRef);
    for (let i = 0; i < carets; i++) {
      const commit = await git.readCommit({ fs, dir: REPO_DIR, oid: currentOid });
      if (!commit.commit.parent || commit.commit.parent.length === 0) {
        throw new Error(`fatal: reference ${ref} has no parent`);
      }
      currentOid = commit.commit.parent[0];
    }
    return currentOid;
  }

  try {
    return await git.resolveRef({ fs, dir: REPO_DIR, ref });
  } catch {
    return ref;
  }
}

export async function snapshotRepoState(): Promise<RepoState> {
  const initialized = await isRepoInitialized();
  if (!initialized) {
    return {
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
  }

  let headRef = '';
  let headOid = '';
  let isDetached = false;

  try {
    const rawHead = await readTextFile(pfs, `${REPO_DIR}/.git/HEAD`);
    const trimmed = rawHead.trim();
    if (trimmed.startsWith('ref: refs/heads/')) {
      headRef = trimmed.replace('ref: refs/heads/', '');
      try {
        headOid = await git.resolveRef({ fs, dir: REPO_DIR, ref: headRef });
      } catch {
        headOid = '';
      }
    } else if (trimmed.length === 40) {
      isDetached = true;
      headOid = trimmed;
    }
  } catch {
    headRef = 'main';
  }

  let rawBranches: string[] = [];
  try {
    rawBranches = await git.listBranches({ fs, dir: REPO_DIR });
  } catch {
    rawBranches = [];
  }

  const branches: BranchRef[] = [];
  for (const b of rawBranches) {
    let oid = '';
    try {
      oid = await git.resolveRef({ fs, dir: REPO_DIR, ref: b });
    } catch {
      oid = '';
    }
    branches.push({
      name: b,
      oid,
      isCurrent: !isDetached && (b === headRef || (rawBranches.length === 1 && headRef === '')),
    });
  }

  let rawTags: string[] = [];
  try {
    rawTags = await git.listTags({ fs, dir: REPO_DIR });
  } catch {
    rawTags = [];
  }

  const tags: TagRef[] = [];
  for (const t of rawTags) {
    try {
      const oid = await git.resolveRef({ fs, dir: REPO_DIR, ref: t });
      tags.push({ name: t, oid });
    } catch {
      // Ignore unresolvable tag
    }
  }

  const commitMap = new Map<string, CommitInfo>();
  const startingRefs = [...branches.map((b) => b.name), ...tags.map((t) => t.name)];
  if (isDetached && headOid) {
    startingRefs.push(headOid);
  }

  for (const ref of startingRefs) {
    try {
      const logs = await git.log({ fs, dir: REPO_DIR, ref, depth: 100 });
      for (const entry of logs) {
        if (!commitMap.has(entry.oid)) {
          commitMap.set(entry.oid, {
            oid: entry.oid,
            shortOid: entry.oid.slice(0, 7),
            message: entry.commit.message.trim(),
            author: {
              name: entry.commit.author.name,
              email: entry.commit.author.email,
              timestamp: entry.commit.author.timestamp,
              timezoneOffset: entry.commit.author.timezoneOffset,
            },
            committer: {
              name: entry.commit.committer.name,
              email: entry.commit.committer.email,
              timestamp: entry.commit.committer.timestamp,
              timezoneOffset: entry.commit.committer.timezoneOffset,
            },
            parentOids: entry.commit.parent || [],
            treeOid: entry.commit.tree,
            branches: [],
            tags: [],
            isHead: entry.oid === headOid,
          });
        }
      }
    } catch {
      // Branch might not have any commits yet
    }
  }

  for (const b of branches) {
    if (b.oid && commitMap.has(b.oid)) {
      commitMap.get(b.oid)!.branches.push(b.name);
    }
  }
  for (const t of tags) {
    if (t.oid && commitMap.has(t.oid)) {
      commitMap.get(t.oid)!.tags.push(t.name);
    }
  }

  const commits = Array.from(commitMap.values());

  const stagedFiles: WorkingFile[] = [];
  const unstagedFiles: WorkingFile[] = [];
  const untrackedFiles: string[] = [];

  try {
    const matrix = await git.statusMatrix({ fs, dir: REPO_DIR });
    for (const [filepath, headStatus, workdirStatus, stageStatus] of matrix) {
      const fullPath = `${REPO_DIR}/${filepath}`;
      const content = await readTextFile(pfs, fullPath);

      if (headStatus === 0 && workdirStatus === 2 && stageStatus === 0) {
        untrackedFiles.push(filepath);
      } else if (headStatus === 0 && workdirStatus === 2 && stageStatus === 2) {
        stagedFiles.push({
          path: filepath,
          status: 'added',
          staged: true,
          content,
        });
      } else if (headStatus === 1 && workdirStatus === 2 && stageStatus === 2) {
        stagedFiles.push({
          path: filepath,
          status: 'modified',
          staged: true,
          content,
        });
      } else if (headStatus === 1 && workdirStatus === 2 && stageStatus === 1) {
        unstagedFiles.push({
          path: filepath,
          status: 'modified',
          staged: false,
          content,
        });
      } else if (headStatus === 1 && workdirStatus === 0 && stageStatus === 0) {
        stagedFiles.push({
          path: filepath,
          status: 'deleted',
          staged: true,
        });
      } else if (headStatus === 1 && workdirStatus === 0 && stageStatus === 1) {
        unstagedFiles.push({
          path: filepath,
          status: 'deleted',
          staged: false,
        });
      }
    }
  } catch {
    // Empty working directory or uninitialized state
  }

  return {
    initialized: true,
    head: {
      type: isDetached ? 'detached' : 'branch',
      target: isDetached ? (headOid ? headOid.slice(0, 7) : 'HEAD') : (headRef || 'main'),
      oid: headOid || undefined,
    },
    branches,
    tags,
    commits,
    stagedFiles,
    unstagedFiles,
    untrackedFiles,
    stashes: [],
  };
}

export async function executeInit(defaultBranch = 'main'): Promise<string> {
  await ensureDir(pfs, REPO_DIR);
  await git.init({
    fs,
    dir: REPO_DIR,
    defaultBranch,
  });
  return `Initialized empty Git repository in ${REPO_DIR}/.git/`;
}

export async function executeAdd(filepaths: string[]): Promise<string> {
  if (filepaths.includes('.') || filepaths.includes('-A') || filepaths.includes('--all')) {
    const matrix = await git.statusMatrix({ fs, dir: REPO_DIR });
    for (const [filepath, , workdirStatus] of matrix) {
      if (workdirStatus === 0) {
        await git.remove({ fs, dir: REPO_DIR, filepath });
      } else {
        await git.add({ fs, dir: REPO_DIR, filepath });
      }
    }
  } else {
    for (const file of filepaths) {
      try {
        const stat = await pfs.stat(`${REPO_DIR}/${file}`);
        if (stat.isDirectory()) {
          const files = await listAllFiles(pfs, REPO_DIR, file);
          for (const sub of files) {
            await git.add({ fs, dir: REPO_DIR, filepath: sub });
          }
        } else {
          await git.add({ fs, dir: REPO_DIR, filepath: file });
        }
      } catch {
        try {
          await git.remove({ fs, dir: REPO_DIR, filepath: file });
        } catch {
          throw new Error(`pathspec '${file}' did not match any files`);
        }
      }
    }
  }
  return '';
}

export async function executeRm(filepaths: string[], cached = false): Promise<string> {
  for (const file of filepaths) {
    await git.remove({ fs, dir: REPO_DIR, filepath: file });
    if (!cached) {
      try {
        await pfs.unlink(`${REPO_DIR}/${file}`);
      } catch {
        // File may already be absent
      }
    }
  }
  return '';
}

export async function executeCommit(message: string, _allowEmpty = false): Promise<{ sha: string; output: string }> {
  const sha = await git.commit({
    fs,
    dir: REPO_DIR,
    message,
    author: defaultAuthor,
    committer: defaultAuthor,
    noUpdateBranch: false,
  });

  const shortSha = sha.slice(0, 7);
  let branch = 'main';
  try {
    const current = await git.currentBranch({ fs, dir: REPO_DIR });
    if (current) branch = current;
  } catch {
    // Detached head
  }

  const output = `[${branch} ${shortSha}] ${message}`;
  return { sha, output };
}

export async function executeBranch(args: {
  list?: boolean;
  create?: string;
  delete?: string;
  forceDelete?: string;
}): Promise<string> {
  if (args.create) {
    await git.branch({
      fs,
      dir: REPO_DIR,
      ref: args.create,
      checkout: false,
    });
    return '';
  }

  if (args.delete || args.forceDelete) {
    const target = args.delete || args.forceDelete!;
    await git.deleteBranch({
      fs,
      dir: REPO_DIR,
      ref: target,
    });
    return `Deleted branch ${target}.`;
  }

  const branches = await git.listBranches({ fs, dir: REPO_DIR });
  const current = await git.currentBranch({ fs, dir: REPO_DIR });
  return branches
    .map((b) => (b === current ? `* \x1b[32m${b}\x1b[0m` : `  ${b}`))
    .join('\n');
}

export async function executeCheckout(target: string, createBranch = false): Promise<string> {
  if (createBranch) {
    await git.branch({
      fs,
      dir: REPO_DIR,
      ref: target,
      checkout: true,
    });
    return `Switched to a new branch '${target}'`;
  }

  const branches = await git.listBranches({ fs, dir: REPO_DIR });
  if (branches.includes(target)) {
    await git.checkout({
      fs,
      dir: REPO_DIR,
      ref: target,
    });
    return `Switched to branch '${target}'`;
  }

  try {
    const oid = await resolveCommitRef(target);
    await git.checkout({
      fs,
      dir: REPO_DIR,
      ref: oid,
    });
    return `Note: switching to '${target}'.\nYou are in 'detached HEAD' state. HEAD is now at ${oid.slice(0, 7)}`;
  } catch {
    throw new Error(`pathspec '${target}' did not match any file(s) known to git`);
  }
}

export async function executeMerge(theirsBranch: string, message?: string): Promise<string> {
  const current = await git.currentBranch({ fs, dir: REPO_DIR });
  if (!current) {
    throw new Error('You are in detached HEAD state. Cannot merge.');
  }

  const mergeReport = await git.merge({
    fs,
    dir: REPO_DIR,
    ours: current,
    theirs: theirsBranch,
    author: defaultAuthor,
    committer: defaultAuthor,
    message: message || `Merge branch '${theirsBranch}' into ${current}`,
  });

  if (mergeReport.tree) {
    if (mergeReport.fastForward) {
      return `Updating ${current} (Fast-forward)\nMerged '${theirsBranch}' into '${current}'.`;
    }
    return `Merge made by the 'recursive' strategy.\nMerged '${theirsBranch}' into '${current}'.`;
  }

  return `Already up to date.`;
}

export async function executeTag(args: {
  list?: boolean;
  name?: string;
  target?: string;
  delete?: string;
  message?: string;
}): Promise<string> {
  if (args.delete) {
    await git.deleteTag({
      fs,
      dir: REPO_DIR,
      ref: args.delete,
    });
    return `Deleted tag '${args.delete}'`;
  }

  if (args.name) {
    let oid = args.target;
    if (!oid) {
      oid = await resolveCommitRef('HEAD');
    } else {
      oid = await resolveCommitRef(oid);
    }

    await git.tag({
      fs,
      dir: REPO_DIR,
      ref: args.name,
      object: oid,
    });
    return '';
  }

  const tags = await git.listTags({ fs, dir: REPO_DIR });
  return tags.join('\n');
}

export async function executeReset(targetRef: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed'): Promise<string> {
  const targetOid = await resolveCommitRef(targetRef);

  const current = await git.currentBranch({ fs, dir: REPO_DIR });
  if (current) {
    await git.writeRef({
      fs,
      dir: REPO_DIR,
      ref: `refs/heads/${current}`,
      value: targetOid,
      force: true,
    });
  } else {
    await writeTextFile(pfs, `${REPO_DIR}/.git/HEAD`, targetOid);
  }

  if (mode === 'hard') {
    await git.checkout({
      fs,
      dir: REPO_DIR,
      ref: targetOid,
      force: true,
    });
    return `HEAD is now at ${targetOid.slice(0, 7)}`;
  } else if (mode === 'mixed') {
    await git.checkout({
      fs,
      dir: REPO_DIR,
      ref: targetOid,
      noCheckout: true,
    });
    return `Unstaged changes after reset:`;
  } else {
    return `HEAD is now at ${targetOid.slice(0, 7)} (soft reset)`;
  }
}

export async function executeRevert(commitRef: string): Promise<string> {
  const targetOid = await resolveCommitRef(commitRef);
  const commitObj = await git.readCommit({ fs, dir: REPO_DIR, oid: targetOid });
  const message = `Revert "${commitObj.commit.message.split('\n')[0]}"\n\nThis reverts commit ${targetOid}.`;

  const parents = commitObj.commit.parent;
  if (!parents || parents.length === 0) {
    throw new Error('Cannot revert a root commit with no parent');
  }

  const parentOid = parents[0];
  const parentCommit = await git.readCommit({ fs, dir: REPO_DIR, oid: parentOid });

  await git.commit({
    fs,
    dir: REPO_DIR,
    message,
    tree: parentCommit.commit.tree,
    author: defaultAuthor,
    committer: defaultAuthor,
  });

  return `[${targetOid.slice(0, 7)}] ${message.split('\n')[0]}`;
}

export async function executeCherryPick(commitRef: string): Promise<string> {
  const targetOid = await resolveCommitRef(commitRef);
  const commitObj = await git.readCommit({ fs, dir: REPO_DIR, oid: targetOid });
  const message = commitObj.commit.message;

  const sha = await git.commit({
    fs,
    dir: REPO_DIR,
    message: `${message} (cherry-picked from ${targetOid.slice(0, 7)})`,
    author: commitObj.commit.author,
    committer: defaultAuthor,
  });

  return `[${sha.slice(0, 7)}] Cherry-picked commit ${targetOid.slice(0, 7)}`;
}

export async function executeRebase(upstreamBranch: string): Promise<string> {
  const current = await git.currentBranch({ fs, dir: REPO_DIR });
  if (!current) {
    throw new Error('Cannot rebase in detached HEAD state');
  }

  const currentOid = await resolveCommitRef(current);
  const upstreamOid = await resolveCommitRef(upstreamBranch);

  if (currentOid === upstreamOid) {
    return `Current branch ${current} is up to date.`;
  }

  const currentLogs = await git.log({ fs, dir: REPO_DIR, ref: current, depth: 50 });
  const upstreamLogs = await git.log({ fs, dir: REPO_DIR, ref: upstreamBranch, depth: 50 });
  const upstreamOids = new Set(upstreamLogs.map((l) => l.oid));

  const commitsToReplay = currentLogs.filter((l) => !upstreamOids.has(l.oid)).reverse();

  if (commitsToReplay.length === 0) {
    await git.writeRef({
      fs,
      dir: REPO_DIR,
      ref: `refs/heads/${current}`,
      value: upstreamOid,
      force: true,
    });
    await git.checkout({ fs, dir: REPO_DIR, ref: current, force: true });
    return `Successfully rebased and updated refs/heads/${current}.`;
  }

  await git.writeRef({
    fs,
    dir: REPO_DIR,
    ref: `refs/heads/${current}`,
    value: upstreamOid,
    force: true,
  });
  await git.checkout({ fs, dir: REPO_DIR, ref: current, force: true });

  for (const item of commitsToReplay) {
    await git.commit({
      fs,
      dir: REPO_DIR,
      message: item.commit.message,
      author: item.commit.author,
      committer: defaultAuthor,
    });
  }

  return `Successfully rebased and updated refs/heads/${current}.`;
}

export async function executeWriteFile(path: string, content: string, append = false): Promise<string> {
  const fullPath = `${REPO_DIR}/${path.replace(/^\//, '')}`;
  let finalContent = content;
  if (append) {
    const existing = await readTextFile(pfs, fullPath);
    finalContent = existing + content;
  }
  await writeTextFile(pfs, fullPath, finalContent);
  return '';
}

export async function executeDeleteFile(path: string): Promise<string> {
  const fullPath = `${REPO_DIR}/${path.replace(/^\//, '')}`;
  try {
    await pfs.unlink(fullPath);
  } catch {
    // File may not exist
  }
  return '';
}

export async function executeReadFile(path: string): Promise<string> {
  const fullPath = `${REPO_DIR}/${path.replace(/^\//, '')}`;
  return readTextFile(pfs, fullPath);
}

export async function executeListFiles(): Promise<string[]> {
  return listAllFiles(pfs, REPO_DIR);
}

export async function resetRepository(): Promise<RepoState> {
  fs = resetFS();
  pfs = fs.promises;
  return snapshotRepoState();
}

// Worker message router (only in Web Worker context)
if (typeof self !== 'undefined' && typeof (self as any).postMessage === 'function') {
  self.onmessage = async (e: MessageEvent) => {
    const { id, type, payload } = e.data;
    try {
      let output = '';
      let extra: any = {};

      switch (type) {
        case 'INIT':
          output = await executeInit(payload?.defaultBranch || 'main');
          break;
        case 'ADD':
          output = await executeAdd(payload.files);
          break;
        case 'RM':
          output = await executeRm(payload.files, payload.cached);
          break;
        case 'COMMIT': {
          const res = await executeCommit(payload.message, payload.allowEmpty);
          output = res.output;
          extra.sha = res.sha;
          break;
        }
        case 'BRANCH':
          output = await executeBranch(payload);
          break;
        case 'CHECKOUT':
          output = await executeCheckout(payload.target, payload.createBranch);
          break;
        case 'MERGE':
          output = await executeMerge(payload.theirs, payload.message);
          break;
        case 'REBASE':
          output = await executeRebase(payload.upstream);
          break;
        case 'CHERRY_PICK':
          output = await executeCherryPick(payload.commit);
          break;
        case 'TAG':
          output = await executeTag(payload);
          break;
        case 'RESET':
          output = await executeReset(payload.target, payload.mode);
          break;
        case 'REVERT':
          output = await executeRevert(payload.commit);
          break;
        case 'WRITE_FILE':
          output = await executeWriteFile(payload.path, payload.content, payload.append);
          break;
        case 'DELETE_FILE':
          output = await executeDeleteFile(payload.path);
          break;
        case 'READ_FILE':
          output = await executeReadFile(payload.path);
          break;
        case 'RESET_REPO':
          await resetRepository();
          break;
        case 'GET_STATE':
          break;
        default:
          throw new Error(`Unknown worker operation: ${type}`);
      }

      const state = await snapshotRepoState();
      self.postMessage({ id, success: true, output, state, extra });
    } catch (err: any) {
      let state: RepoState;
      try {
        state = await snapshotRepoState();
      } catch {
        state = {
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
      }
      self.postMessage({ id, success: false, error: err.message || String(err), state });
    }
  };
}
