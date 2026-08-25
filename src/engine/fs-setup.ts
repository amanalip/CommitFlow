import FS from '@isomorphic-git/lightning-fs';

let currentFsName = 'commitflow-fs';
let fsInstance = new FS(currentFsName, { wipe: true });

export function getFS(): FS {
  return fsInstance;
}

export function resetFS(): FS {
  currentFsName = `commitflow-fs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  fsInstance = new FS(currentFsName, { wipe: true });
  return fsInstance;
}

export async function ensureDir(pfs: any, dirPath: string): Promise<void> {
  const parts = dirPath.split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current += '/' + part;
    try {
      await pfs.mkdir(current);
    } catch (e: any) {
      if (e.code !== 'EEXIST') {
        // Ignore directory exists
      }
    }
  }
}

export async function listAllFiles(pfs: any, baseDir = '/repo', prefix = ''): Promise<string[]> {
  const fullPath = prefix ? `${baseDir}/${prefix}` : baseDir;
  let entries: string[] = [];
  try {
    entries = await pfs.readdir(fullPath);
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    if (entry === '.git') continue;
    const relPath = prefix ? `${prefix}/${entry}` : entry;
    const itemPath = `${baseDir}/${relPath}`;
    try {
      const stat = await pfs.stat(itemPath);
      if (stat.isDirectory()) {
        const subFiles = await listAllFiles(pfs, baseDir, relPath);
        files.push(...subFiles);
      } else {
        files.push(relPath);
      }
    } catch {
      // Ignore
    }
  }
  return files;
}

export async function readTextFile(pfs: any, filePath: string): Promise<string> {
  try {
    const data = await pfs.readFile(filePath, 'utf8');
    return typeof data === 'string' ? data : new TextDecoder().decode(data);
  } catch {
    return '';
  }
}

export async function writeTextFile(pfs: any, filePath: string, content: string): Promise<void> {
  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  if (dir) {
    await ensureDir(pfs, dir);
  }
  await pfs.writeFile(filePath, content, 'utf8');
}
