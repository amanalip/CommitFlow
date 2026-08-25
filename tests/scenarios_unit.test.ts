import { describe, it, expect } from 'vitest';
import { SCENARIOS } from '../src/scenarios/data';

describe('Scenarios Data Validation', () => {
  it('bundles 25 to 30 substantial interactive learning scenarios', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(25);
    expect(SCENARIOS.length).toBeLessThanOrEqual(30);
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
      expect(s.estimatedMinutes).toBeGreaterThan(0);
      expect(s.learningObjectives.length).toBeGreaterThanOrEqual(3);
      expect(s.concepts.length).toBeGreaterThanOrEqual(3);
      expect(s.steps.length, s.title).toBeGreaterThanOrEqual(15);
      expect(s.steps.length).toBeLessThanOrEqual(20);

      for (const step of s.steps) {
        expect(step.command).toBeTruthy();
        expect(step.description).toBeTruthy();
        expect(step.explanation).toBeTruthy();
      }
    }
  });
});
