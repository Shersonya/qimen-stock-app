/** @jest-environment node */

import { mapWithConcurrency } from '@/lib/utils/async';

describe('mapWithConcurrency', () => {
  it('preserves input order even when workers resolve out of order', async () => {
    const result = await mapWithConcurrency(
      [1, 2, 3],
      2,
      async (item) => {
        const delay = item === 1 ? 30 : item === 2 ? 10 : 20;

        await new Promise((resolve) => {
          setTimeout(resolve, delay);
        });

        return `item-${item}`;
      },
    );

    expect(result).toEqual(['item-1', 'item-2', 'item-3']);
  });

  it('does not exceed the requested concurrency', async () => {
    let activeCount = 0;
    let maxActiveCount = 0;

    await mapWithConcurrency(
      [1, 2, 3, 4],
      2,
      async (item) => {
        activeCount += 1;
        maxActiveCount = Math.max(maxActiveCount, activeCount);

        await new Promise((resolve) => {
          setTimeout(resolve, item * 5);
        });

        activeCount -= 1;

        return item * 10;
      },
    );

    expect(maxActiveCount).toBeLessThanOrEqual(2);
  });
});
