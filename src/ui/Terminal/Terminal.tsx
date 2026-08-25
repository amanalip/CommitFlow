import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

import { RepoState, CommandResult } from '../../model/types';
import { THEMES, ThemeMode } from '../../theme/theme';
import { getAutocompleteCandidates } from '../../parser/suggestions';
import styles from './Terminal.module.css';

interface TerminalProps {
  repoState: RepoState;
  onExecuteCommand: (command: string) => Promise<CommandResult>;
  themeMode?: ThemeMode;
}

export function Terminal({ repoState, onExecuteCommand, themeMode = 'dark' }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef<number>(-1);
  const currentLine = useRef<string>('');
  const cursorPosition = useRef<number>(0);
  const isExecuting = useRef<boolean>(false);

  const repoStateRef = useRef<RepoState>(repoState);
  repoStateRef.current = repoState;

  const onExecuteCommandRef = useRef(onExecuteCommand);
  onExecuteCommandRef.current = onExecuteCommand;

  const getPrompt = useCallback(() => {
    const state = repoStateRef.current;
    if (!state.initialized) {
      return '\x1b[38;2;148;163;184mcommitflow\x1b[0m \x1b[38;2;56;189;248m$\x1b[0m ';
    }
    const branchName = state.head.type === 'detached'
      ? `(${state.head.target})`
      : `(${state.head.target})`;
    return `\x1b[38;2;148;163;184mrepo\x1b[0m \x1b[38;2;74;222;128m${branchName}\x1b[0m \x1b[38;2;56;189;248m$\x1b[0m `;
  }, []);

  const writePrompt = useCallback(() => {
    if (xtermInstance.current) {
      xtermInstance.current.write(getPrompt());
      currentLine.current = '';
      cursorPosition.current = 0;
    }
  }, [getPrompt]);

  const safeFit = useCallback(() => {
    if (!terminalRef.current || !fitAddonRef.current) return;
    const { clientWidth, clientHeight } = terminalRef.current;
    if (clientWidth > 0 && clientHeight > 0) {
      try {
        fitAddonRef.current.fit();
      } catch {
        // Ignore fit measurement error
      }
    }
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;

    terminalRef.current.innerHTML = '';

    const termTheme = THEMES[themeMode].xterm;
    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.25,
      theme: termTheme,
      convertEol: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[1;36mCommitFlow Terminal\x1b[0m');
    term.writeln('\x1b[90mType "git init" to start or "help" for a list of commands.\x1b[0m\n');
    writePrompt();

    const timer = setTimeout(() => {
      safeFit();
    }, 100);

    const handleResize = () => {
      safeFit();
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      safeFit();
    });
    resizeObserver.observe(terminalRef.current);

    const disposable = term.onKey(async ({ key, domEvent }) => {
      if (isExecuting.current) return;

      const keyName = domEvent.key;
      const isCtrl = domEvent.ctrlKey || domEvent.metaKey;

      // Handle Ctrl+C (Interrupt/Cancel)
      if (isCtrl && keyName === 'c') {
        term.write('^C\r\n');
        writePrompt();
        return;
      }

      // Handle Ctrl+L (Clear screen)
      if (isCtrl && keyName === 'l') {
        term.clear();
        term.write(getPrompt() + currentLine.current);
        return;
      }

      // Handle Ctrl+U (Erase line before cursor)
      if (isCtrl && keyName === 'u') {
        currentLine.current = currentLine.current.slice(cursorPosition.current);
        cursorPosition.current = 0;
        term.write('\r' + getPrompt() + ' '.repeat(currentLine.current.length + 50) + '\r' + getPrompt() + currentLine.current);
        return;
      }

      // Handle Ctrl+A / Home (Move cursor to start)
      if ((isCtrl && keyName === 'a') || keyName === 'Home') {
        if (cursorPosition.current > 0) {
          term.write('\b'.repeat(cursorPosition.current));
          cursorPosition.current = 0;
        }
        return;
      }

      // Handle Ctrl+E / End (Move cursor to end)
      if ((isCtrl && keyName === 'e') || keyName === 'End') {
        const diff = currentLine.current.length - cursorPosition.current;
        if (diff > 0) {
          term.write(currentLine.current.slice(cursorPosition.current));
          cursorPosition.current = currentLine.current.length;
        }
        return;
      }

      // Handle ArrowLeft
      if (keyName === 'ArrowLeft') {
        if (cursorPosition.current > 0) {
          cursorPosition.current--;
          term.write('\b');
        }
        return;
      }

      // Handle ArrowRight
      if (keyName === 'ArrowRight') {
        if (cursorPosition.current < currentLine.current.length) {
          term.write(currentLine.current[cursorPosition.current]);
          cursorPosition.current++;
        }
        return;
      }

      if (keyName === 'Enter') {
        const line = currentLine.current.trim();
        term.write('\r\n');

        if (line) {
          commandHistory.current.push(line);
          historyIndex.current = commandHistory.current.length;
          isExecuting.current = true;
          try {
            const res = await onExecuteCommandRef.current(line);
            if (res) {
              if (res.stdout) {
                term.write(res.stdout.replace(/\n/g, '\r\n') + '\r\n');
              }
              if (res.stderr) {
                term.write(res.stderr.replace(/\n/g, '\r\n') + '\r\n');
              }
            }
          } catch (err: any) {
            term.write(`\x1b[31m${err.message || String(err)}\x1b[0m\r\n`);
          } finally {
            isExecuting.current = false;
            writePrompt();
          }
        } else {
          writePrompt();
        }
      } else if (keyName === 'Backspace') {
        if (cursorPosition.current > 0) {
          const before = currentLine.current.slice(0, cursorPosition.current - 1);
          const after = currentLine.current.slice(cursorPosition.current);
          currentLine.current = before + after;
          cursorPosition.current--;

          term.write('\b' + after + ' ' + '\b'.repeat(after.length + 1));
        }
      } else if (keyName === 'ArrowUp') {
        if (historyIndex.current > 0) {
          historyIndex.current--;
          const histCmd = commandHistory.current[historyIndex.current];
          term.write('\r' + getPrompt() + ' '.repeat(currentLine.current.length + 20) + '\r' + getPrompt());
          term.write(histCmd);
          currentLine.current = histCmd;
          cursorPosition.current = histCmd.length;
        }
      } else if (keyName === 'ArrowDown') {
        if (historyIndex.current < commandHistory.current.length - 1) {
          historyIndex.current++;
          const histCmd = commandHistory.current[historyIndex.current];
          term.write('\r' + getPrompt() + ' '.repeat(currentLine.current.length + 20) + '\r' + getPrompt());
          term.write(histCmd);
          currentLine.current = histCmd;
          cursorPosition.current = histCmd.length;
        } else if (historyIndex.current === commandHistory.current.length - 1) {
          historyIndex.current = commandHistory.current.length;
          term.write('\r' + getPrompt() + ' '.repeat(currentLine.current.length + 20) + '\r' + getPrompt());
          currentLine.current = '';
          cursorPosition.current = 0;
        }
      } else if (keyName === 'Tab') {
        domEvent.preventDefault();
        const state = repoStateRef.current;
        const branchNames = state.branches.map((b) => b.name);
        const fileNames = [
          ...state.stagedFiles.map((f) => f.path),
          ...state.unstagedFiles.map((f) => f.path),
          ...state.untrackedFiles,
        ];
        const candidates = getAutocompleteCandidates(currentLine.current, branchNames, fileNames);
        if (candidates.length === 1) {
          const completed = candidates[0];
          term.write('\r' + getPrompt() + ' '.repeat(currentLine.current.length + 20) + '\r' + getPrompt());
          term.write(completed);
          currentLine.current = completed;
          cursorPosition.current = completed.length;
        } else if (candidates.length > 1) {
          term.writeln('\r\n' + candidates.join('   '));
          term.write(getPrompt() + currentLine.current);
        }
      } else if (key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
        const before = currentLine.current.slice(0, cursorPosition.current);
        const after = currentLine.current.slice(cursorPosition.current);
        currentLine.current = before + key + after;
        cursorPosition.current++;

        term.write(key + after + '\b'.repeat(after.length));
      }
    });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      disposable.dispose();
      try {
        term.dispose();
      } catch {
        // Ignore
      }
      xtermInstance.current = null;
      fitAddonRef.current = null;
    };
  }, [themeMode, safeFit, getPrompt, writePrompt]);

  useEffect(() => {
    if (xtermInstance.current) {
      xtermInstance.current.options.theme = THEMES[themeMode].xterm;
    }
  }, [themeMode]);

  const handleClear = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
      writePrompt();
    }
  };

  return (
    <div className={styles.terminalContainer}>
      <div className={styles.terminalHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.windowDots}>
            <span className={`${styles.dot} ${styles.dotRed}`} />
            <span className={`${styles.dot} ${styles.dotYellow}`} />
            <span className={`${styles.dot} ${styles.dotGreen}`} />
          </div>
          <span className={styles.terminalTitle}>bash - commitflow</span>
        </div>
        <div className={styles.terminalActions}>
          <button className={styles.actionButton} onClick={handleClear} title="Clear terminal">
            Clear
          </button>
        </div>
      </div>
      <div ref={terminalRef} className={styles.xtermWrapper} />
    </div>
  );
}
