export type ThemeMode = 'dark' | 'light';

export const LANE_COLORS = [
  '#38bdf8', // 0: sky-400 (main branch)
  '#a855f7', // 1: purple-500 (feature)
  '#22c55e', // 2: green-500
  '#f59e0b', // 3: amber-500
  '#ec4899', // 4: pink-500
  '#06b6d4', // 5: cyan-500
  '#e11d48', // 6: rose-600
];

export function getLaneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length];
}

export const THEMES = {
  dark: {
    bg: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    border: '#334155',
    borderLight: '#475569',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    accent: '#38bdf8',
    accentHover: '#0284c7',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    nodeBg: '#1e293b',
    nodeBorder: '#475569',
    nodeSelected: '#38bdf8',
    terminalBg: '#0b1120',
    terminalHeader: '#172033',
    xterm: {
      background: '#0a0f1d',
      foreground: '#f1f5f9',
      cursor: '#38bdf8',
      cursorAccent: '#0a0f1d',
      selectionBackground: '#334155',
      black: '#1e293b',
      red: '#f87171',
      green: '#4ade80',
      yellow: '#facc15',
      blue: '#60a5fa',
      magenta: '#c084fc',
      cyan: '#38bdf8',
      white: '#f8fafc',
      brightBlack: '#475569',
      brightRed: '#ef4444',
      brightGreen: '#22c55e',
      brightYellow: '#eab308',
      brightBlue: '#3b82f6',
      brightMagenta: '#a855f7',
      brightCyan: '#06b6d4',
      brightWhite: '#ffffff',
    },
  },
  light: {
    bg: '#f8fafc',
    bgSecondary: '#ffffff',
    bgTertiary: '#f1f5f9',
    border: '#e2e8f0',
    borderLight: '#cbd5e1',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    accent: '#0284c7',
    accentHover: '#0369a1',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    nodeBg: '#ffffff',
    nodeBorder: '#cbd5e1',
    nodeSelected: '#0284c7',
    terminalBg: '#f8fafc',
    terminalHeader: '#ffffff',
    xterm: {
      background: '#f8fafc',
      foreground: '#0f172a',
      cursor: '#0284c7',
      cursorAccent: '#f8fafc',
      selectionBackground: '#e2e8f0',
      black: '#0f172a',
      red: '#dc2626',
      green: '#16a34a',
      yellow: '#d97706',
      blue: '#2563eb',
      magenta: '#9333ea',
      cyan: '#0891b2',
      white: '#ffffff',
      brightBlack: '#64748b',
      brightRed: '#b91c1c',
      brightGreen: '#15803d',
      brightYellow: '#b45309',
      brightBlue: '#1d4ed8',
      brightMagenta: '#7e22ce',
      brightCyan: '#0e7490',
      brightWhite: '#0f172a',
    },
  },
};
