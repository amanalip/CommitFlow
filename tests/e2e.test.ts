import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';
import { createServer, ViteDevServer } from 'vite';

describe('Browser End-to-End Test', () => {
  let server: ViteDevServer;
  let port = 3456;

  it('loads page, types git commands, and updates the commit graph', async () => {
    server = await createServer({
      server: { port },
    });
    await server.listen();

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto(`http://localhost:${port}/`);
    await page.waitForTimeout(1000);

    // Verify title and header are present
    const headerTitle = await page.locator('header').innerText();
    expect(headerTitle).toContain('CommitFlow');
    expect(await page.getByText('Your commit history will appear here').isVisible()).toBe(true);
    expect(await page.getByRole('button', { name: 'Zoom in' }).count()).toBe(1);
    expect(await page.getByRole('button', { name: 'Zoom out' }).count()).toBe(1);

    await page.getByRole('button', { name: 'Export' }).click();
    expect(await page.getByRole('menuitem', { name: 'PNG image' }).isVisible()).toBe(true);
    expect(await page.getByRole('menuitem', { name: 'SVG vector' }).isVisible()).toBe(true);
    await page.getByRole('button', { name: 'Export' }).click();

    // Focus terminal and type commands
    const terminal = page.locator('.xterm-helper-textarea');
    await terminal.focus();

    // 1. git init
    await page.keyboard.type('git init');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 2. touch file
    await page.keyboard.type('echo "first content" > index.html');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 3. git add
    await page.keyboard.type('git add index.html');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 4. git commit
    await page.keyboard.type('git commit -m "initial commit"');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Check commit node rendered in React Flow
    const commitNode = page.locator('.react-flow__node');
    expect(await commitNode.isVisible()).toBe(true);
    const commitText = await commitNode.innerText();
    expect(commitText).toContain('initial commit');
    expect(commitText).toContain('Commit');
    expect(commitText).toContain('ID');
    expect(commitText).toContain('Root commit');

    const accessibleCommit = page.getByRole('button', { name: /Inspect commit.*initial commit/ });
    await accessibleCommit.focus();
    await page.keyboard.press('Enter');
    expect(await page.getByRole('dialog').isVisible()).toBe(true);
    await page.keyboard.press('Escape');

    // Theme changes must update xterm in place without erasing scrollback.
    const terminalRows = page.locator('.xterm-rows');
    expect(await terminalRows.innerText()).toContain('initial commit');
    await page.getByTitle('Switch to light mode').click();
    await page.waitForTimeout(200);
    expect(await terminalRows.innerText()).toContain('initial commit');
    expect((await terminalRows.innerText()).match(/CommitFlow Terminal/g)?.length).toBe(1);

    // Reset clears both repository state and terminal state.
    await page.getByRole('button', { name: /Reset/ }).click();
    await page.waitForTimeout(300);
    expect(await page.locator('.react-flow__node').count()).toBe(0);
    expect(await terminalRows.innerText()).not.toContain('initial commit');
    expect(await terminalRows.innerText()).toContain('CommitFlow Terminal');

    // The learning browser exposes deep lesson metadata and scenario steps echo in the terminal.
    await page.getByRole('button', { name: /Learning scenarios 28/ }).click();
    expect(await page.getByRole('dialog', { name: 'Choose a learning scenario' }).isVisible()).toBe(true);
    expect(await page.getByText('28 lessons available').isVisible()).toBe(true);
    await page.getByPlaceholder('Search commands, concepts, or difficulty').fill('first repo');
    await page.getByRole('button', { name: /Your First Repo/ }).click();
    const lessonControls = page.getByRole('region', { name: /Your First Repo learning controls/ });
    await lessonControls.waitFor({ state: 'visible' });
    expect(await lessonControls.isVisible()).toBe(true);
    expect(await page.getByText(/0 of \d+ complete/).isVisible()).toBe(true);
    expect(await page.getByText('Lesson map').isVisible()).toBe(true);
    await page.getByRole('button', { name: 'Run step' }).click();
    await page.getByText(/1 of \d+ complete/).waitFor({ state: 'visible' });
    expect(await page.getByText(/1 of \d+ complete/).isVisible()).toBe(true);
    expect(await terminalRows.innerText()).toContain('git init');

    await page.getByRole('button', { name: /Reset/ }).click();
    await page.waitForTimeout(200);

    // insertText sends a complete data chunk, matching browser paste behavior.
    await terminal.focus();
    await page.keyboard.insertText('help');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect(await terminalRows.innerText()).toContain('Filesystem & Utility Commands');

    // Build a playground state that must survive an Explainer simulation.
    for (const command of [
      'git init',
      'echo "preserved" > preserved.txt',
      'git add preserved.txt',
      'git commit -m "preserved playground"',
    ]) {
      await page.keyboard.insertText(command);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(250);
    }
    expect(await page.locator('.react-flow__node').innerText()).toContain('preserved playground');

    // Switch to Explainer mode
    const explainerBtn = page.getByRole('button', { name: 'Explainer' });
    await explainerBtn.click();
    await page.waitForTimeout(1000);
    expect(await page.getByRole('alert').count()).toBe(0);
    expect(await page.getByRole('button', { name: /Reset/ }).count()).toBe(0);
    expect(await page.getByRole('button', { name: /Share/ }).count()).toBe(0);

    const playgroundBtn = page.getByRole('button', { name: 'Playground' });
    await page.waitForFunction(() => {
      const button = Array.from(document.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === 'Playground'
      );
      return button && !button.disabled;
    });
    await playgroundBtn.click();
    await page.waitForTimeout(300);
    expect(await page.locator('.react-flow__node').innerText()).toContain('preserved playground');

    // Verify footer and github link
    const footerText = await page.locator('footer').innerText();
    expect(footerText).toContain('Aman Ali Pogaku');

    const githubLink = page.locator('header a[href="https://github.com/amanalip/CommitFlow"]');
    expect(await githubLink.isVisible()).toBe(true);

    expect(pageErrors.length).toBe(0);

    await browser.close();
    await server.close();
  }, 30000);
});
