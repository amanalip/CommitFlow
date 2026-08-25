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
  resetKey?: number;
  externalCommand?: { id: number; command: string; result: CommandResult } | null;
}

const WELCOME_LINES = [
  '\x1b[1;36mCommitFlow Terminal\x1b[0m',
  '\x1b[90mType "git init" to start or "help" for a list of commands.\x1b[0m',
];

export function Terminal({
  repoState,
  onExecuteCommand,
  themeMode = 'dark',
  resetKey = 0,
  externalCommand = null,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef<number>(-1);
  const currentLine = useRef<string>('');
  const cursorPosition = useRef<number>(0);
  const isExecuting = useRef<boolean>(false);
  const mountedResetKey = useRef<number>(resetKey);
  const lastExternalCommandId = useRef(0);

  const repoStateRef = useRef<RepoState>(repoState);
  repoStateRef.current = repoState;

  const onExecuteCommandRef = useRef(onExecuteCommand);
  onExecuteCommandRef.current = onExecuteCommand;

  const getPrompt = useCallback(() => {
    const state = repoStateRef.current;
    if (!state.initialized) {
      return '\x1b[38;2;148;163;184mcommitflow\x1b[0m \x1b[38;2;56;189;248m$\x1b[0m ';
    }

    const branchColor = state.head.type === 'detached' ? '248;113;113' : '74;222;128';
    const label = state.head.type === 'detached' ? `detached:${state.head.target}` : state.head.target;
    return `\x1b[38;2;148;163;184mrepo\x1b[0m \x1b[38;2;${branchColor}m(${label})\x1b[0m \x1b[38;2;56;189;248m$\x1b[0m `;
  }, []);

  const redrawInput = useCallback(() => {
    const term = xtermInstance.current;
    if (!term) return;

    term.write(`\x1b[2K\r${getPrompt()}${currentLine.current}`);
    const distanceFromEnd = currentLine.current.length - cursorPosition.current;
    if (distanceFromEnd > 0) {
      term.write(`\x1b[${distanceFromEnd}D`);
    }
  }, [getPrompt]);

  const writePrompt = useCallback(() => {
    currentLine.current = '';
    cursorPosition.current = 0;
    xtermInstance.current?.write(getPrompt());
  }, [getPrompt]);

  const writeWelcome = useCallback(() => {
    const term = xtermInstance.current;
    if (!term) return;
    term.writeln(WELCOME_LINES[0]);
    term.writeln(WELCOME_LINES[1]);
    term.writeln('');
    writePrompt();
  }, [writePrompt]);

  const safeFit = useCallback(() => {
    if (!terminalRef.current || !fitAddonRef.current) return;
    const { clientWidth, clientHeight } = terminalRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    try {
      fitAddonRef.current.fit();
    } catch {
      // The ResizeObserver will try again after layout settles.
    }
  }, []);

  const replaceInput = useCallback((value: string) => {
    currentLine.current = value;
    cursorPosition.current = value.length;
    redrawInput();
  }, [redrawInput]);

  const insertText = useCallback((value: string) => {
    if (!value) return;
    const normalized = value.replace(/\r?\n/g, ' ');
    const before = currentLine.current.slice(0, cursorPosition.current);
    const after = currentLine.current.slice(cursorPosition.current);
    currentLine.current = before + normalized + after;
    cursorPosition.current += normalized.length;
    redrawInput();
  }, [redrawInput]);

  const executeCurrentLine = useCallback(async () => {
    const term = xtermInstance.current;
    if (!term || isExecuting.current) return;

    const line = currentLine.current.trim();
    term.write('\r\n');

    if (!line) {
      writePrompt();
      return;
    }

    commandHistory.current.push(line);
    historyIndex.current = commandHistory.current.length;
    isExecuting.current = true;

    try {
      const result = await onExecuteCommandRef.current(line);
      if (result.stdout) {
        term.write(result.stdout.replace(/\n/g, '\r\n') + '\r\n');
      }
      if (result.stderr) {
        term.write(result.stderr.replace(/\n/g, '\r\n') + '\r\n');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      term.write(`\x1b[31m${message}\x1b[0m\r\n`);
    } finally {
      isExecuting.current = false;
      writePrompt();
    }
  }, [writePrompt]);

  const completeInput = useCallback(() => {
    const state = repoStateRef.current;
    const branchNames = state.branches.map((branch) => branch.name);
    const fileNames = [
      ...state.stagedFiles.map((file) => file.path),
      ...state.unstagedFiles.map((file) => file.path),
      ...state.untrackedFiles,
    ];
    const candidates = getAutocompleteCandidates(currentLine.current, branchNames, fileNames);

    if (candidates.length === 1) {
      replaceInput(candidates[0]);
    } else if (candidates.length > 1) {
      xtermInstance.current?.writeln('\r\n' + candidates.join('   '));
      redrawInput();
    }
  }, [redrawInput, replaceInput]);

  const handleData = useCallback(async (data: string) => {
    const term = xtermInstance.current;
    if (!term || isExecuting.current) return;

    switch (data) {
      case '\r':
        await executeCurrentLine();
        return;
      case '\x7f': {
        if (cursorPosition.current === 0) return;
        const before = currentLine.current.slice(0, cursorPosition.current - 1);
        const after = currentLine.current.slice(cursorPosition.current);
        currentLine.current = before + after;
        cursorPosition.current -= 1;
        redrawInput();
        return;
      }
      case '\x1b[D':
        if (cursorPosition.current > 0) {
          cursorPosition.current -= 1;
          term.write('\x1b[D');
        }
        return;
      case '\x1b[C':
        if (cursorPosition.current < currentLine.current.length) {
          cursorPosition.current += 1;
          term.write('\x1b[C');
        }
        return;
      case '\x1b[A':
        if (historyIndex.current > 0) {
          historyIndex.current -= 1;
          replaceInput(commandHistory.current[historyIndex.current]);
        }
        return;
      case '\x1b[B':
        if (historyIndex.current < commandHistory.current.length - 1) {
          historyIndex.current += 1;
          replaceInput(commandHistory.current[historyIndex.current]);
        } else if (historyIndex.current === commandHistory.current.length - 1) {
          historyIndex.current = commandHistory.current.length;
          replaceInput('');
        }
        return;
      case '\x1b[H':
      case '\x1b[1~':
      case '\x01':
        cursorPosition.current = 0;
        redrawInput();
        return;
      case '\x1b[F':
      case '\x1b[4~':
      case '\x05':
        cursorPosition.current = currentLine.current.length;
        redrawInput();
        return;
      case '\x1b[3~':
        if (cursorPosition.current < currentLine.current.length) {
          currentLine.current =
            currentLine.current.slice(0, cursorPosition.current) +
            currentLine.current.slice(cursorPosition.current + 1);
          redrawInput();
        }
        return;
      case '\x03':
        term.write('^C\r\n');
        writePrompt();
        return;
      case '\x0c':
        term.write('\x1b[2J\x1b[H');
        redrawInput();
        return;
      case '\x15':
        currentLine.current = currentLine.current.slice(cursorPosition.current);
        cursorPosition.current = 0;
        redrawInput();
        return;
      case '\t':
        completeInput();
        return;
      default:
        if (data.startsWith('\x1b')) return;
        insertText(data);
    }
  }, [completeInput, executeCurrentLine, insertText, redrawInput, replaceInput, writePrompt]);

  useEffect(() => {
    if (!terminalRef.current) return;

    terminalRef.current.innerHTML = '';
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: "'Fira Code', 'SFMono-Regular', Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.3,
      theme: THEMES[themeMode].xterm,
      convertEol: true,
      scrollback: 2000,
      smoothScrollDuration: 100,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;
    writeWelcome();

    const fitTimer = window.setTimeout(safeFit, 100);
    const resizeObserver = new ResizeObserver(safeFit);
    resizeObserver.observe(terminalRef.current);
    const dataDisposable = term.onData(handleData);

    return () => {
      window.clearTimeout(fitTimer);
      resizeObserver.disconnect();
      dataDisposable.dispose();
      term.dispose();
      xtermInstance.current = null;
      fitAddonRef.current = null;
    };
  }, [handleData, safeFit, writeWelcome]);

  useEffect(() => {
    if (xtermInstance.current) {
      xtermInstance.current.options.theme = THEMES[themeMode].xterm;
    }
  }, [themeMode]);

  useEffect(() => {
    if (mountedResetKey.current === resetKey || !xtermInstance.current) return;
    mountedResetKey.current = resetKey;
    commandHistory.current = [];
    historyIndex.current = -1;
    currentLine.current = '';
    cursorPosition.current = 0;
    isExecuting.current = false;
    xtermInstance.current.clear();
    xtermInstance.current.write('\x1b[2J\x1b[H');
    writeWelcome();
  }, [resetKey, writeWelcome]);

  useEffect(() => {
    const term = xtermInstance.current;
    if (!externalCommand || !term || externalCommand.id <= lastExternalCommandId.current) return;
    lastExternalCommandId.current = externalCommand.id;
    currentLine.current = '';
    cursorPosition.current = 0;
    commandHistory.current.push(externalCommand.command);
    historyIndex.current = commandHistory.current.length;
    term.write(`\x1b[2K\r${getPrompt()}\x1b[38;2;56;189;248m${externalCommand.command}\x1b[0m\r\n`);
    if (externalCommand.result.stdout) term.write(`${externalCommand.result.stdout.replace(/\n/g, '\r\n')}\r\n`);
    if (externalCommand.result.stderr) term.write(`${externalCommand.result.stderr.replace(/\n/g, '\r\n')}\r\n`);
    writePrompt();
  }, [externalCommand, getPrompt, writePrompt]);

  useEffect(() => {
    if (!isExecuting.current && xtermInstance.current) {
      redrawInput();
    }
  }, [repoState.initialized, repoState.head.type, repoState.head.target, redrawInput]);

  const handleClear = () => {
    const term = xtermInstance.current;
    if (!term) return;
    currentLine.current = '';
    cursorPosition.current = 0;
    term.clear();
    term.write('\x1b[2J\x1b[H');
    writePrompt();
    term.focus();
  };

  return (
    <div className={styles.terminalContainer} aria-label="CommitFlow terminal">
      <div className={styles.terminalHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.windowDots} aria-hidden="true">
            <span className={`${styles.dot} ${styles.dotRed}`} />
            <span className={`${styles.dot} ${styles.dotYellow}`} />
            <span className={`${styles.dot} ${styles.dotGreen}`} />
          </div>
          <span className={styles.terminalTitle}>bash / commitflow</span>
        </div>
        <div className={styles.terminalActions}>
          <button type="button" className={styles.actionButton} onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>
      <div ref={terminalRef} className={styles.xtermWrapper} />
    </div>
  );
}
