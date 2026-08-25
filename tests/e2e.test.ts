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

    // Switch to Explainer mode
    const explainerBtn = page.getByRole('button', { name: 'Explainer' });
    await explainerBtn.click();
    await page.waitForTimeout(1000);

    const explainerTitle = page.locator('text=Git Command Explainer');
    expect(await explainerTitle.isVisible()).toBe(true);

    expect(pageErrors.length).toBe(0);

    await browser.close();
    await server.close();
  }, 30000);
});
