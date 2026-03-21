/** @jest-environment node */

import {
  ATAN,
  BARSLAST,
  COUNT,
  HHV,
  IF_FUNC,
  LLV,
  MA,
  MAX,
  MIN,
  MOD,
  NOT,
  REF,
} from '@/lib/tdx/indicators';

describe('tdx indicators', () => {
  it('builds moving averages and lookbacks over available windows', () => {
    expect(MA([1, 2, 3, 4], 2)).toEqual([1, 1.5, 2.5, 3.5]);
    expect(REF([10, 20, 30, 40], 2)).toEqual([0, 0, 10, 20]);
  });

  it('tracks rolling extrema and boolean counts', () => {
    expect(LLV([4, 3, 5, 2], 3)).toEqual([4, 3, 3, 2]);
    expect(HHV([4, 3, 5, 2], 3)).toEqual([4, 4, 5, 5]);
    expect(COUNT([true, false, true, true], 3)).toEqual([1, 1, 2, 2]);
    expect(BARSLAST([false, false, true, false, false])).toEqual([1, 2, 0, 1, 2]);
  });

  it('supports scalar-style helper transforms', () => {
    expect(ATAN([0, 1]).map((value) => Number(value.toFixed(4)))).toEqual([0, 0.7854]);
    expect(MOD([5, 7], [2, 0])).toEqual([1, 0]);
    expect(IF_FUNC([true, false], [1, 2], [3, 4])).toEqual([1, 4]);
    expect(NOT([true, false])).toEqual([false, true]);
    expect(MAX([1, 5], [2, 4])).toEqual([2, 5]);
    expect(MIN([1, 5], [2, 4])).toEqual([1, 4]);
  });
});
