import { act, renderHook } from '@testing-library/react';

import { useToast } from '@/lib/hooks/use-toast';

describe('useToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('clears the current toast message after the configured duration', () => {
    const { result } = renderHook(() => useToast(1200));

    act(() => {
      result.current[1]('已完成');
    });

    expect(result.current[0]).toBe('已完成');

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(result.current[0]).toBeNull();
  });
});
