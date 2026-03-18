/** @jest-environment node */

import { generateQimenChart, inspectQimenChart } from '@/lib/qimen/engine';
import { qimenBenchmarkFixtures } from '@/tests/fixtures/qimen-benchmark-fixtures';

describe('generateQimenChart benchmarks', () => {
  it.each(qimenBenchmarkFixtures)(
    'matches the pinned benchmark fixture for $datetime',
    ({ datetime, expected, debug }) => {
      const result = generateQimenChart(new Date(datetime), {
        includeDebug: true,
      });

      expect(result).toEqual({
        ...expected,
        debug,
      });
    },
  );

  it.each(qimenBenchmarkFixtures)(
    'exposes the same debug snapshot through inspectQimenChart for $datetime',
    ({ datetime, expected, debug }) => {
      expect(inspectQimenChart(new Date(datetime))).toEqual({
        ...expected,
        debug,
      });
    },
  );
});
