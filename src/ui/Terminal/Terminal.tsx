import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

import { RepoState } from '../../model/types';
import { THEMES, ThemeMode } from '../../theme/theme';
import { getAutocompleteCandidates } from '../../parser/suggestions';
import styles from './Terminal.module.css';

interface TerminalProps {
  repoState: RepoState;
  onExecuteCommand: (command: string) => Promise<void>;
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

  const getPrompt = useCallback(() => {
    if (!repoState.initialized) {
      return '\x1b[38;2;148;163;184mcommitflow\x1b[0m \x1b[38;2;56;189;248m$\x1b[0m ';
    }
    const branchName = repoState.head.type === 'detached'
      ? `(${repoState.head.target})`
      : `(${repoState.head.target})`;
    return `\x1b[38;2;148;163;184mrepo\x1b[0m \x1b[38;2;74;222;128m${branchName}\x1b[0m \x1b[38;2;56;189;248m$\x1b[0m `;
  }, [repoState]);

  const writePrompt = useCallback(() => {
    if (xtermInstance.current) {
      xtermInstance.current.write(getPrompt());
      currentLine.current = '';
      cursorPosition.current = 0;
    }
  }, [getPrompt]);

  // Handle terminal initialization
  useEffect(() => {
    if (!terminalRef.current) return;

    const termTheme = THEMES[themeMode].xterm;
    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.25,
      theme: termTheme,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[1;36mCommitFlow Terminal\x1b[0m');
    term.writeln('\x1b[90mType "git init" to start or "help" for a list of commands.\x1b[0m\n');
    writePrompt();

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore fit error on hidden tab
      }
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      term.dispose();
      xtermInstance.current = null;
    };
  }, [themeMode, writePrompt]);

  // Update theme colors
  useEffect(() => {
    if (xtermInstance.current) {
      xtermInstance.current.options.theme = THEMES[themeMode].xterm;
    }
  }, [themeMode]);

  // Key event handling
  useEffect(() => {
    const term = xtermInstance.current;
    if (!term) return;

    const disposable = term.onKey(async ({ key, domEvent }) => {
      if (isExecuting.current) return;

      const ev = domEvent;
      const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

      if (ev.keyCode === 13) {
        // ENTER key
        const line = currentLine.current.trim();
        term.write('\r\n');

        if (line) {
          commandHistory.current.push(line);
          historyIndex.current = commandHistory.current.length;
          isExecuting.current = true;
          try {
            await onExecuteCommand(line);
          } finally {
            isExecuting.current = false;
            writePrompt();
          }
        } else {
          writePrompt();
        }
      } else if (ev.keyCode === 8) {
        // BACKSPACE key
        if (cursorPosition.current > 0) {
          const before = currentLine.current.slice(0, cursorPosition.current - 1);
          const after = currentLine.current.slice(cursorPosition.current);
          currentLine.current = before + after;
          cursorPosition.current--;

          term.write('\b' + after + ' ' + '\b'.repeat(after.length + 1));
        }
      } else if (ev.keyCode === 38) {
        // UP arrow (history back)
        if (historyIndex.current > 0) {
          historyIndex.current--;
          const histCmd = commandHistory.current[historyIndex.current];
          // Clear current line
          term.write('\r' + getPrompt() + ' '.repeat(currentLine.current.length) + '\r' + getPrompt());
          term.write(histCmd);
          currentLine.current = histCmd;
          cursorPosition.current = histCmd.length;
        }
      } else if (ev.keyCode === 40) {
        // DOWN arrow (history forward)
        if (historyIndex.current < commandHistory.current.length - 1) {
          historyIndex.current++;
          const histCmd = commandHistory.current[historyIndex.current];
          term.write('\r' + getPrompt() + ' '.repeat(currentLine.current.length) + '\r' + getPrompt());
          term.write(histCmd);
          currentLine.current = histCmd;
          cursorPosition.current = histCmd.length;
        } else if (historyIndex.current === commandHistory.current.length - 1) {
          historyIndex.current = commandHistory.current.length;
          term.write('\r' + getPrompt() + ' '.repeat(currentLine.current.length) + '\r' + getPrompt());
          currentLine.current = '';
          cursorPosition.current = 0;
        }
      } else if (ev.keyCode === 9) {
        // TAB key (autocomplete)
        ev.preventDefault();
        const branchNames = repoState.branches.map((b) => b.name);
        const fileNames = [
          ...repoState.stagedFiles.map((f) => f.path),
          ...repoState.unstagedFiles.map((f) => f.path),
          ...repoState.untrackedFiles,
        ];
        const candidates = getAutocompleteCandidates(currentLine.current, branchNames, fileNames);
        if (candidates.length === 1) {
          const completed = candidates[0];
          term.write('\r' + getPrompt() + ' '.repeat(currentLine.current.length) + '\r' + getPrompt());
          term.write(completed);
          currentLine.current = completed;
          cursorPosition.current = completed.length;
        } else if (candidates.length > 1) {
          term.writeln('\r\n' + candidates.join('   '));
          term.write(getPrompt() + currentLine.current);
        }
      } else if (printable) {
        const before = currentLine.current.slice(0, cursorPosition.current);
        const after = currentLine.current.slice(cursorPosition.current);
        currentLine.current = before + key + after;
        cursorPosition.current++;

        term.write(key + after + '\b'.repeat(after.length));
      }
    });

    return () => {
      disposable.dispose();
    };
  }, [getPrompt, onExecuteCommand, repoState, writePrompt]);

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
