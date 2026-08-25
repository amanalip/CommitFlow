import { Buffer } from 'buffer';
if (typeof globalThis !== 'undefined' && !(globalThis as any).Buffer) {
  (globalThis as any).Buffer = Buffer;
}
import git from 'isomorphic-git';
import {
  getFS,
  resetFS,
  ensureDir,
  listAllFiles,
  readTextFile,
  writeTextFile,
  captureFSContext,
  restoreFSContext,
  FSRuntimeContext,
} from './fs-setup';
import { RepoState, CommitInfo, BranchRef, TagRef, WorkingFile } from '../model/types';

const REPO_DIR = '/repo';

let defaultAuthor = {
  name: 'CommitFlow User',
  email: 'user@commitflow.dev',
};

let stashList: { id: number; message: string; staged: WorkingFile[]; unstaged: WorkingFile[]; untracked: string[] }[] = [];
let previousBranch = '';

export interface GitRuntimeContext {
  fs: FSRuntimeContext;
  stashes: typeof stashList;
  previousBranch: string;
}

export function startIsolatedRuntime(): GitRuntimeContext {
  const context: GitRuntimeContext = {
    fs: captureFSContext(),
    stashes: stashList,
    previousBranch,
  };
  resetFS();
  stashList = [];
  previousBranch = '';
  return context;
}

export function restoreRuntime(context: GitRuntimeContext): void {
  restoreFSContext(context.fs);
  stashList = context.stashes;
  previousBranch = context.previousBranch;
}

export function setAuthor(name: string, email: string) {
  defaultAuthor = { name, email };
}

async function isRepoInitialized(): Promise<boolean> {
  const fs = getFS();
  const pfs = fs.promises;
  try {
    await pfs.stat(`${REPO_DIR}/.git`);
    return true;
  } catch {
    return false;
  }
}

export async function resolveCommitRef(ref: string): Promise<string> {
  const fs = getFS();

  // Handle HEAD~N
  const matchTilde = ref.match(/^(.*?)~(\d+)$/);
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

  // Handle HEAD^N (e.g. HEAD^2 for second parent of merge commit)
  const matchCaretNum = ref.match(/^(.*?)\^(\d+)$/);
  if (matchCaretNum) {
    const baseRef = matchCaretNum[1] || 'HEAD';
    const parentIndex = parseInt(matchCaretNum[2], 10) - 1;
    const currentOid = await resolveCommitRef(baseRef);
    const commit = await git.readCommit({ fs, dir: REPO_DIR, oid: currentOid });
    if (!commit.commit.parent || commit.commit.parent.length <= parentIndex) {
      throw new Error(`fatal: reference ${ref} parent ${parentIndex + 1} does not exist`);
    }
    return commit.commit.parent[parentIndex];
  }

  // Handle HEAD^ or HEAD^^
  const matchCaret = ref.match(/^(.*?)\^+$/);
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
  const fs = getFS();
  const pfs = fs.promises;

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

  const rawCommits = Array.from(commitMap.values());
  rawCommits.sort((a, b) => a.author.timestamp - b.author.timestamp);

  const sortedCommits: CommitInfo[] = [];
  const visited = new Set<string>();

  function visit(commit: CommitInfo) {
    if (visited.has(commit.oid)) return;
    for (const parentOid of commit.parentOids) {
      const parent = commitMap.get(parentOid);
      if (parent && !visited.has(parentOid)) {
        visit(parent);
      }
    }
    visited.add(commit.oid);
    sortedCommits.push(commit);
  }

  for (const c of rawCommits) {
    visit(c);
  }

  const stagedFiles: WorkingFile[] = [];
  const unstagedFiles: WorkingFile[] = [];
  const untrackedFiles: string[] = [];
  let headTreeOid = '';

  if (headOid) {
    try {
      const headCommit = await git.readCommit({ fs, dir: REPO_DIR, oid: headOid });
      headTreeOid = headCommit.commit.tree;
    } catch {
      headTreeOid = '';
    }
  }

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
      } else if (headStatus === 1 && workdirStatus === 1 && stageStatus === 1 && headTreeOid) {
        // LightningFS timestamps can have the same precision as the index. Compare
        // contents so rapid same-size edits are not incorrectly reported as clean.
        try {
          const { blob } = await git.readBlob({ fs, dir: REPO_DIR, oid: headTreeOid, filepath });
          const headContent = Buffer.from(blob).toString('utf8');
          if (headContent !== content) {
            unstagedFiles.push({
              path: filepath,
              status: 'modified',
              staged: false,
              content,
              oldContent: headContent,
            });
          }
        } catch {
          // The status matrix remains the source of truth if content lookup fails.
        }
      } else if (headStatus === 1 && workdirStatus === 0 && stageStatus === 0) {
        stagedFiles.push({
          path: filepath,
          status: 'deleted',
          staged: true,
        });
      } else if (headStatus === 1 && workdirStatus > 0 && stageStatus === 0) {
        stagedFiles.push({
          path: filepath,
          status: 'deleted',
          staged: true,
        });
        untrackedFiles.push(filepath);
      } else if (headStatus === 1 && workdirStatus === 0 && stageStatus === 1) {
        unstagedFiles.push({
          path: filepath,
          status: 'deleted',
          staged: false,
        });
      }
    }
  } catch {
    // Empty working directory
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
    commits: sortedCommits,
    stagedFiles,
    unstagedFiles,
    untrackedFiles,
    stashes: stashList.map((s, idx) => ({ index: idx, message: s.message, oid: String(s.id) })),
  };
}

export async function executeInit(defaultBranch = 'main'): Promise<string> {
  const fs = getFS();
  const pfs = fs.promises;
  await ensureDir(pfs, REPO_DIR);
  await git.init({
    fs,
    dir: REPO_DIR,
    defaultBranch,
  });
  return `Initialized empty Git repository in ${REPO_DIR}/.git/`;
}

export async function executeAdd(filepaths: string[]): Promise<string> {
  const fs = getFS();
  const pfs = fs.promises;

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
      const cleanFile = file.replace(/^\.\//, '');
      try {
        const stat = await pfs.stat(`${REPO_DIR}/${cleanFile}`);
        if (stat.isDirectory()) {
          const files = await listAllFiles(pfs, REPO_DIR, cleanFile);
          for (const sub of files) {
            await git.add({ fs, dir: REPO_DIR, filepath: sub });
          }
        } else {
          await git.add({ fs, dir: REPO_DIR, filepath: cleanFile });
        }
      } catch {
        try {
          await git.remove({ fs, dir: REPO_DIR, filepath: cleanFile });
        } catch {
          throw new Error(`pathspec '${cleanFile}' did not match any files`);
        }
      }
    }
  }
  return '';
}

export async function executeRm(filepaths: string[], cached = false): Promise<string> {
  const fs = getFS();
  const pfs = fs.promises;
  for (const file of filepaths) {
    const cleanFile = file.replace(/^\.\//, '');
    await git.remove({ fs, dir: REPO_DIR, filepath: cleanFile });
    if (!cached) {
      try {
        await pfs.unlink(`${REPO_DIR}/${cleanFile}`);
      } catch {
        // Ignore
      }
    }
  }
  return '';
}

export async function executeRestore(filepaths: string[], staged = false): Promise<string> {
  const fs = getFS();
  const pfs = fs.promises;

  for (const file of filepaths) {
    const cleanFile = file.replace(/^\.\//, '');
    if (staged) {
      try {
        await git.resetIndex({ fs, dir: REPO_DIR, filepath: cleanFile });
      } catch {
        throw new Error(`error: pathspec '${cleanFile}' did not match any file(s) known to git`);
      }
    } else {
      try {
        const headOid = await resolveCommitRef('HEAD');
        const commit = await git.readCommit({ fs, dir: REPO_DIR, oid: headOid });
        const { blob } = await git.readBlob({ fs, dir: REPO_DIR, oid: commit.commit.tree, filepath: cleanFile });
        const str = Buffer.from(blob).toString('utf8');
        await writeTextFile(pfs, `${REPO_DIR}/${cleanFile}`, str);
      } catch {
        throw new Error(`error: pathspec '${cleanFile}' did not match any file(s) known to git`);
      }
    }
  }
  return '';
}

export async function executeCommit(
  message: string,
  _allowEmpty = false,
  amend = false
): Promise<{ sha: string; output: string }> {
  const fs = getFS();

  let parent: string[] | undefined = undefined;
  if (amend) {
    try {
      const headOid = await resolveCommitRef('HEAD');
      const headCommit = await git.readCommit({ fs, dir: REPO_DIR, oid: headOid });
      parent = headCommit.commit.parent;
    } catch {
      // First commit
    }
  }

  const sha = await git.commit({
    fs,
    dir: REPO_DIR,
    message,
    parent,
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
    // Detached
  }

  const output = `[${branch} ${shortSha}] ${message}`;
  return { sha, output };
}

export async function executeBranch(args: {
  list?: boolean;
  create?: string;
  delete?: string;
  forceDelete?: string;
  rename?: { oldName?: string; newName: string };
}): Promise<string> {
  const fs = getFS();
  const pfs = fs.promises;

  if (args.rename) {
    const current = await git.currentBranch({ fs, dir: REPO_DIR });
    const oldName = args.rename.oldName || current || 'main';
    const newName = args.rename.newName;
    const oid = await git.resolveRef({ fs, dir: REPO_DIR, ref: oldName });

    await git.writeRef({
      fs,
      dir: REPO_DIR,
      ref: `refs/heads/${newName}`,
      value: oid,
      force: true,
    });
    await git.deleteBranch({ fs, dir: REPO_DIR, ref: oldName });

    if (current === oldName) {
      await writeTextFile(pfs, `${REPO_DIR}/.git/HEAD`, `ref: refs/heads/${newName}\n`);
    }
    return `Renamed branch ${oldName} to ${newName}.`;
  }

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

export async function executeCheckout(target: string, createBranch = false, startPoint?: string): Promise<string> {
  const fs = getFS();
  const pfs = fs.promises;

  const current = await git.currentBranch({ fs, dir: REPO_DIR });

  if (target === '-') {
    if (!previousBranch) {
      throw new Error('fatal: No previous branch available');
    }
    target = previousBranch;
  }

  if (createBranch) {
    let startOid: string | undefined = undefined;
    if (startPoint) {
      startOid = await resolveCommitRef(startPoint);
    }
    await git.branch({
      fs,
      dir: REPO_DIR,
      ref: target,
      object: startOid,
      checkout: true,
    });
    await writeTextFile(pfs, `${REPO_DIR}/.git/HEAD`, `ref: refs/heads/${target}\n`);
    if (current && current !== target) {
      previousBranch = current;
    }
    return `Switched to a new branch '${target}'`;
  }

  const branches = await git.listBranches({ fs, dir: REPO_DIR });
  if (branches.includes(target)) {
    await writeTextFile(pfs, `${REPO_DIR}/.git/HEAD`, `ref: refs/heads/${target}\n`);
    await git.checkout({
      fs,
      dir: REPO_DIR,
      ref: target,
    });
    if (current && current !== target) {
      previousBranch = current;
    }
    return `Switched to branch '${target}'`;
  }

  try {
    const oid = await resolveCommitRef(target);
    await writeTextFile(pfs, `${REPO_DIR}/.git/HEAD`, `${oid}\n`);
    await git.checkout({
      fs,
      dir: REPO_DIR,
      ref: oid,
    });
    if (current) {
      previousBranch = current;
    }
    return `Note: switching to '${target}'.\nYou are in 'detached HEAD' state. HEAD is now at ${oid.slice(0, 7)}`;
  } catch {
    throw new Error(`pathspec '${target}' did not match any file(s) known to git`);
  }
}

export async function executeMerge(theirsBranch: string, message?: string): Promise<string> {
  const fs = getFS();
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
  const fs = getFS();
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
  const fs = getFS();
  const pfs = fs.promises;
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
    await writeTextFile(pfs, `${REPO_DIR}/.git/HEAD`, `${targetOid}\n`);
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
  const fs = getFS();
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
  const fs = getFS();
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
  const fs = getFS();
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

export async function executeShow(commitRef = 'HEAD'): Promise<string> {
  const fs = getFS();
  const oid = await resolveCommitRef(commitRef);
  const commitObj = await git.readCommit({ fs, dir: REPO_DIR, oid });
  const dateStr = new Date(commitObj.commit.author.timestamp * 1000).toUTCString();

  return [
    `\x1b[33mcommit ${oid}\x1b[0m`,
    `Author: ${commitObj.commit.author.name} <${commitObj.commit.author.email}>`,
    `Date:   ${dateStr}`,
    `Tree:   ${commitObj.commit.tree}`,
    '',
    `    ${commitObj.commit.message}`,
  ].join('\n');
}

export async function executeDiff(staged = false): Promise<string> {
  const fs = getFS();
  const pfs = fs.promises;
  const matrix = await git.statusMatrix({ fs, dir: REPO_DIR });
  const diffLines: string[] = [];

  for (const [filepath, headStatus, workdirStatus, stageStatus] of matrix) {
    if (staged) {
      if (headStatus === 0 && stageStatus === 2) {
        diffLines.push(`\x1b[1mdiff --git a/${filepath} b/${filepath}\x1b[0m`);
        diffLines.push(`\x1b[32m+++ b/${filepath} (staged new file)\x1b[0m`);
        const content = await readTextFile(pfs, `${REPO_DIR}/${filepath}`);
        for (const line of content.split('\n')) {
          if (line) diffLines.push(`\x1b[32m+ ${line}\x1b[0m`);
        }
      } else if (headStatus === 1 && stageStatus === 2) {
        diffLines.push(`\x1b[1mdiff --git a/${filepath} b/${filepath}\x1b[0m`);
        diffLines.push(`\x1b[33m--- a/${filepath}\x1b[0m`);
        diffLines.push(`\x1b[32m+++ b/${filepath} (staged modification)\x1b[0m`);
        const content = await readTextFile(pfs, `${REPO_DIR}/${filepath}`);
        for (const line of content.split('\n')) {
          if (line) diffLines.push(`\x1b[32m+ ${line}\x1b[0m`);
        }
      }
    } else {
      if (workdirStatus === 2 && headStatus === 0) {
        diffLines.push(`\x1b[1mdiff --git a/${filepath} b/${filepath}\x1b[0m`);
        diffLines.push(`\x1b[32m+++ b/${filepath} (new file)\x1b[0m`);
        const content = await readTextFile(pfs, `${REPO_DIR}/${filepath}`);
        for (const line of content.split('\n')) {
          if (line) diffLines.push(`\x1b[32m+ ${line}\x1b[0m`);
        }
      } else if (workdirStatus === 2 && headStatus === 1 && stageStatus === 1) {
        diffLines.push(`\x1b[1mdiff --git a/${filepath} b/${filepath}\x1b[0m`);
        diffLines.push(`\x1b[33m--- a/${filepath}\x1b[0m`);
        diffLines.push(`\x1b[32m+++ b/${filepath}\x1b[0m`);
        const content = await readTextFile(pfs, `${REPO_DIR}/${filepath}`);
        for (const line of content.split('\n')) {
          if (line) diffLines.push(`\x1b[32m+ ${line}\x1b[0m`);
        }
      }
    }
  }

  return diffLines.length > 0 ? diffLines.join('\n') : '';
}

export async function executeStash(subcommand = 'push', message = 'WIP on branch'): Promise<string> {
  const fs = getFS();
  const pfs = fs.promises;

  if (subcommand === 'list') {
    if (stashList.length === 0) return '';
    return stashList.map((s, i) => `stash@{${i}}: ${s.message}`).join('\n');
  }

  if (subcommand === 'pop') {
    if (stashList.length === 0) {
      throw new Error('No stash entries found.');
    }
    const popped = stashList.shift()!;
    for (const f of popped.staged) {
      if (f.content !== undefined) {
        await writeTextFile(pfs, `${REPO_DIR}/${f.path}`, f.content);
        await git.add({ fs, dir: REPO_DIR, filepath: f.path });
      }
    }
    for (const f of popped.unstaged) {
      if (f.content !== undefined) {
        await writeTextFile(pfs, `${REPO_DIR}/${f.path}`, f.content);
      }
    }
    return `Dropped stash@{0} (${popped.message})`;
  }

  if (subcommand === 'clear') {
    stashList = [];
    return '';
  }

  // Stash push
  const state = await snapshotRepoState();
  if (state.stagedFiles.length === 0 && state.unstagedFiles.length === 0 && state.untrackedFiles.length === 0) {
    return 'No local changes to save';
  }

  stashList.unshift({
    id: Date.now(),
    message: `${state.head.target}: ${message}`,
    staged: [...state.stagedFiles],
    unstaged: [...state.unstagedFiles],
    untracked: [...state.untrackedFiles],
  });

  // Revert working tree to HEAD
  try {
    const headOid = await resolveCommitRef('HEAD');
    await git.checkout({ fs, dir: REPO_DIR, ref: headOid, force: true });
  } catch {
    // Empty repo
  }

  return `Saved working directory and index state "${message}"`;
}

export async function executeWriteFile(path: string, content: string, append = false): Promise<string> {
  const fs = getFS();
  const pfs = fs.promises;
  const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '');
  const fullPath = `${REPO_DIR}/${cleanPath}`;
  let finalContent = content;
  if (append) {
    const existing = await readTextFile(pfs, fullPath);
    finalContent = existing + content;
  }
  await writeTextFile(pfs, fullPath, finalContent);
  return '';
}

export async function executeDeleteFile(path: string): Promise<string> {
  const fs = getFS();
  const pfs = fs.promises;
  const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '');
  const fullPath = `${REPO_DIR}/${cleanPath}`;
  try {
    await pfs.unlink(fullPath);
  } catch {
    // File may not exist
  }
  return '';
}

export async function executeReadFile(path: string): Promise<string> {
  const fs = getFS();
  const pfs = fs.promises;
  const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '');
  const fullPath = `${REPO_DIR}/${cleanPath}`;
  return readTextFile(pfs, fullPath);
}

export async function executeListFiles(): Promise<string[]> {
  const fs = getFS();
  const pfs = fs.promises;
  return listAllFiles(pfs, REPO_DIR);
}

export async function resetRepository(): Promise<RepoState> {
  resetFS();
  stashList = [];
  previousBranch = '';
  return snapshotRepoState();
}
