import { applyBoardFilterPreset } from '@/components/FilterPanel';
import type { BoardFilterPreset } from '@/components/FilterPanel';
import type { MarketScreenFilters } from '@/lib/contracts/qimen';

describe('applyBoardFilterPreset', () => {
  it('keeps existing filter fields while merging preset patterns and palace positions', () => {
    const filters: MarketScreenFilters = {
      hour: { door: '开门', star: '', god: '' },
      day: { door: '', star: '天辅星', god: '' },
      month: { door: '', star: '', god: '' },
      pattern: {
        names: ['飞鸟跌穴'],
        minScore: 18,
        bullishOnly: true,
        hourOnly: false,
        palacePositions: [1, 2],
      },
    };
    const boardFilterPreset: BoardFilterPreset = {
      key: 7,
      sourceLabel: '盘面联动',
      patternNames: ['青龙返首', '真诈格'],
      palacePositions: [3, 5],
    };

    const nextFilters = applyBoardFilterPreset(filters, boardFilterPreset);

    expect(nextFilters).toEqual({
      ...filters,
      pattern: {
        ...filters.pattern,
        names: ['青龙返首', '真诈格'],
        palacePositions: [3, 5],
      },
    });
    expect(filters.pattern?.names).toEqual(['飞鸟跌穴']);
    expect(filters.pattern?.palacePositions).toEqual([1, 2]);
  });
});
