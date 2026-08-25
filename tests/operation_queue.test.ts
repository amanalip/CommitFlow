import { describe, expect, it } from 'vitest';
import { OperationQueue } from '../src/engine/operation-queue';

describe('OperationQueue', () => {
  it('runs repository operations in request order without overlap', async () => {
    const queue = new OperationQueue();
    const events: string[] = [];
    let active = 0;
    let maximumActive = 0;

    const operation = (name: string, delay: number) =>
      queue.run(async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        events.push(`${name}:start`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        events.push(`${name}:end`);
        active -= 1;
        return name;
      });

    const results = await Promise.all([
      operation('terminal', 15),
      operation('scenario', 1),
      operation('reset', 1),
    ]);

    expect(results).toEqual(['terminal', 'scenario', 'reset']);
    expect(maximumActive).toBe(1);
    expect(events).toEqual([
      'terminal:start',
      'terminal:end',
      'scenario:start',
      'scenario:end',
      'reset:start',
      'reset:end',
    ]);
  });

  it('continues processing after one operation fails', async () => {
    const queue = new OperationQueue();
    const failed = queue.run(async () => {
      throw new Error('expected failure');
    });
    const recovered = queue.run(async () => 'continued');

    await expect(failed).rejects.toThrow('expected failure');
    await expect(recovered).resolves.toBe('continued');
    await expect(queue.idle()).resolves.toBeUndefined();
  });
});
