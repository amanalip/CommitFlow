import { describe, it, expect } from 'vitest';
import { THEMES, LANE_COLORS, getLaneColor } from '../src/theme/theme';

describe('Theme & Palette Configuration', () => {
  it('defines valid dark and light theme tokens', () => {
    expect(THEMES.dark).toBeDefined();
    expect(THEMES.light).toBeDefined();

    expect(THEMES.dark.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(THEMES.light.bg).toMatch(/^#[0-9a-fA-F]{6}$/);

    expect(THEMES.dark.xterm.background).toBeDefined();
    expect(THEMES.light.xterm.background).toBeDefined();
    expect(THEMES.dark.terminalBg).toBeDefined();
    expect(THEMES.light.terminalBg).toBe(THEMES.light.xterm.background);
    expect(THEMES.dark.terminalHeader).toBeDefined();
    expect(THEMES.light.terminalHeader).toBeDefined();
  });

  it('provides high-contrast lane palette for topological branch rendering', () => {
    expect(LANE_COLORS.length).toBeGreaterThanOrEqual(6);

    for (const color of LANE_COLORS) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }

    expect(getLaneColor(0)).toBe(LANE_COLORS[0]);
    expect(getLaneColor(LANE_COLORS.length)).toBe(LANE_COLORS[0]);
  });
});
