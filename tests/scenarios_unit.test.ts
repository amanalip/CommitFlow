import { describe, it, expect } from 'vitest';
import { SCENARIOS } from '../src/scenarios/data';

describe('Scenarios Data Validation', () => {
  it('bundles at least 7 interactive learning scenarios', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(7);
  });

  it('validates scenario schema and metadata', () => {
    const ids = new Set<string>();

    for (const s of SCENARIOS) {
      expect(s.id).toBeTruthy();
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);

      expect(s.title).toBeTruthy();
      expect(s.summary).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(['Beginner', 'Intermediate', 'Advanced']).toContain(s.difficulty);
      expect(s.steps.length).toBeGreaterThan(0);

      for (const step of s.steps) {
        expect(step.command).toBeTruthy();
        expect(step.description).toBeTruthy();
        expect(step.explanation).toBeTruthy();
      }
    }
  });
});
