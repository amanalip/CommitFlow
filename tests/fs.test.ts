import { describe, it, expect, beforeEach } from 'vitest';
import { getFS, resetFS, ensureDir, listAllFiles, readTextFile, writeTextFile } from '../src/engine/fs-setup';

describe('Virtual Filesystem Setup (LightningFS)', () => {
  beforeEach(() => {
    resetFS();
  });

  it('creates directories and writes and reads files', async () => {
    const fs = getFS();
    const pfs = fs.promises;

    await ensureDir(pfs, '/test/nested/dir');
    await writeTextFile(pfs, '/test/nested/dir/hello.txt', 'Hello CommitFlow');

    const content = await readTextFile(pfs, '/test/nested/dir/hello.txt');
    expect(content).toBe('Hello CommitFlow');
  });

  it('lists all recursive files in directory excluding .git', async () => {
    const fs = getFS();
    const pfs = fs.promises;

    await ensureDir(pfs, '/repo/src');
    await ensureDir(pfs, '/repo/.git/objects');
    await writeTextFile(pfs, '/repo/src/index.ts', 'console.log()');
    await writeTextFile(pfs, '/repo/package.json', '{}');
    await writeTextFile(pfs, '/repo/.git/HEAD', 'ref: refs/heads/main');

    const files = await listAllFiles(pfs, '/repo');
    expect(files).toContain('src/index.ts');
    expect(files).toContain('package.json');
    expect(files.some((f) => f.startsWith('.git'))).toBe(false);
  });

  it('resets filesystem cleanly', async () => {
    const fs = getFS();
    const pfs = fs.promises;

    await ensureDir(pfs, '/repo');
    await writeTextFile(pfs, '/repo/temp.txt', '123');

    resetFS();
    const newFs = getFS();
    const newPfs = newFs.promises;

    const content = await readTextFile(newPfs, '/repo/temp.txt');
    expect(content).toBe('');
  });
});
